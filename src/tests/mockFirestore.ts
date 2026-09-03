export class MockFirestore {
  private collections: Map<string, Map<string, Record<string, unknown>>> = new Map();

  collection(name: string) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }
    const colMap = this.collections.get(name)!;

    return {
      doc: (id?: string) => {
        const docId = id || `mock_doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        return {
          id: docId,
          get: async () => {
            const exists = colMap.has(docId);
            const data = exists ? JSON.parse(JSON.stringify(colMap.get(docId))) : undefined;
            return {
              id: docId,
              exists,
              data: () => data,
            };
          },
          set: async (data: Record<string, unknown>) => {
            colMap.set(docId, JSON.parse(JSON.stringify(data)));
          },
          update: async (data: Record<string, unknown>) => {
            const existing = colMap.get(docId) || {};
            colMap.set(docId, { ...existing, ...JSON.parse(JSON.stringify(data)) });
          },
        };
      },
      get: async () => {
        const docs = Array.from(colMap.entries()).map(([id, data]) => ({
          id,
          exists: true,
          data: () => JSON.parse(JSON.stringify(data)),
        }));
        return {
          empty: docs.length === 0,
          size: docs.length,
          docs,
          forEach: (cb: (doc: { id: string; exists: boolean; data: () => Record<string, unknown> }) => void) =>
            docs.forEach(cb),
        };
      },
      where: (field: string, op: string, value: unknown) => {
        const filtered = Array.from(colMap.entries()).filter(([_, data]) => {
          if (op === '==') return data[field] === value;
          return true;
        });

        return {
          limit: (n: number) => ({
            get: async () => {
              const limited = filtered.slice(0, n).map(([id, data]) => ({
                id,
                exists: true,
                data: () => JSON.parse(JSON.stringify(data)),
              }));
              return {
                empty: limited.length === 0,
                docs: limited,
                forEach: (cb: (doc: { id: string; exists: boolean; data: () => Record<string, unknown> }) => void) =>
                  limited.forEach(cb),
              };
            },
          }),
          get: async () => {
            const docs = filtered.map(([id, data]) => ({
              id,
              exists: true,
              data: () => JSON.parse(JSON.stringify(data)),
            }));
            return {
              empty: docs.length === 0,
              docs,
              forEach: (cb: (doc: { id: string; exists: boolean; data: () => Record<string, unknown> }) => void) =>
                docs.forEach(cb),
            };
          },
        };
      },
    };
  }

  clear() {
    this.collections.clear();
  }
}
