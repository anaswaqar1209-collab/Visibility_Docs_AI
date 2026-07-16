import Document from '../models/Document';

type DuplicateGroup = { documentIds: string[]; count: number };

async function groupsByNameAndSize(filter: Record<string, unknown>): Promise<DuplicateGroup[]> {
    return Document.aggregate([
        { $match: filter },
        {
            $addFields: {
                normName: { $toLower: { $trim: { input: '$originalFilename' } } },
            },
        },
        {
            $group: {
                _id: { normName: '$normName', sizeBytes: '$sizeBytes' },
                documentIds: { $push: '$documentId' },
                count: { $sum: 1 },
            },
        },
        { $match: { count: { $gt: 1 } } },
    ]);
}

async function groupsByContentHash(filter: Record<string, unknown>): Promise<DuplicateGroup[]> {
    return Document.aggregate([
        { $match: { ...filter, contentHash: { $exists: true, $nin: [null, ''] } } },
        {
            $group: {
                _id: '$contentHash',
                documentIds: { $push: '$documentId' },
                count: { $sum: 1 },
            },
        },
        { $match: { count: { $gt: 1 } } },
    ]);
}

/** Map each documentId to how many duplicates share its fingerprint (including itself). */
export async function getDuplicateGroupSizes(
    filter: Record<string, unknown>
): Promise<Map<string, number>> {
    const sizes = new Map<string, number>();
    const [byNameSize, byHash] = await Promise.all([
        groupsByNameAndSize(filter),
        groupsByContentHash(filter),
    ]);

    for (const group of [...byNameSize, ...byHash]) {
        for (const id of group.documentIds) {
            const prev = sizes.get(id) || 1;
            sizes.set(id, Math.max(prev, group.count));
        }
    }
    return sizes;
}

export async function getDuplicateDocumentIds(filter: Record<string, unknown>): Promise<string[]> {
    const sizes = await getDuplicateGroupSizes(filter);
    return [...sizes.keys()];
}

export function annotateDuplicateCounts<T extends { documentId: string }>(
    documents: T[],
    sizes: Map<string, number>
): (T & { duplicateCount: number; isDuplicate: boolean })[] {
    return documents.map((doc) => {
        const duplicateCount = sizes.get(doc.documentId) || 1;
        return {
            ...doc,
            duplicateCount,
            isDuplicate: duplicateCount > 1,
        };
    });
}
