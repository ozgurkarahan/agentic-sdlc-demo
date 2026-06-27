export interface LinkRecord {
  code: string;
  url: string;
  hits: number;
}

export class LinkStore {
  private readonly links = new Map<string, LinkRecord>();

  create(code: string, url: string): LinkRecord {
    if (this.links.has(code)) {
      throw new Error(`Link code already exists: ${code}`);
    }

    const record: LinkRecord = { code, url, hits: 0 };
    this.links.set(code, record);
    return { ...record };
  }

  has(code: string): boolean {
    return this.links.has(code);
  }

  get(code: string): LinkRecord | undefined {
    const record = this.links.get(code);
    return record ? { ...record } : undefined;
  }

  incrementHits(code: string): LinkRecord | undefined {
    const record = this.links.get(code);
    if (!record) {
      return undefined;
    }

    record.hits += 1;
    return { ...record };
  }

  list(): LinkRecord[] {
    return Array.from(this.links.values(), (record) => ({ ...record }));
  }
}
