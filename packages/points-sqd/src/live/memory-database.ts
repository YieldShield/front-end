type HashAndHeight = {
  height: number;
  hash: string;
};

type FinalTxInfo = {
  prevHead: HashAndHeight;
  nextHead: HashAndHeight;
  isOnTop: boolean;
};

export class MemoryFinalDatabase<Store extends object = Record<string, never>> {
  readonly supportsHotBlocks = false;
  private head: HashAndHeight = { height: -1, hash: "0x" };
  private readonly store: Store;

  constructor(store: Store = {} as Store) {
    this.store = store;
  }

  async connect() {
    return this.head;
  }

  async transact(info: FinalTxInfo, cb: (store: Store) => Promise<void>) {
    await cb(this.store);
    this.head = info.nextHead;
  }
}
