import { isFragmentVNode, isMarshalledVNode, isVNode, VNode, VNodeRepresentationSource } from "./vnode";
import { isSourceReference } from "./source-reference";
import {
  asyncExtendedIterable,
  isIterableIterator,
  isPromise
} from "iterable";
import { Source } from "./source";
import { LaneInput, merge } from "@opennetwork/progressive-merge";

async function* childrenUnion(childrenGroups: LaneInput<ReadonlyArray<VNode>>): AsyncIterable<ReadonlyArray<VNode>> {
  for await (const parts of merge(childrenGroups)) {
    yield parts.reduce(
      (updates: VNode[], part: (VNode | undefined)[]): VNode[] => updates.concat((part || []).filter(value => value)),
      []
    );
  }
}

export async function *children(createNode: (source: Source<never>) => VNode, ...source: VNodeRepresentationSource[]): AsyncIterable<ReadonlyArray<VNode>> {
  async function *eachSource(source: VNodeRepresentationSource): AsyncIterable<ReadonlyArray<VNode>> {
    if (typeof source === "undefined") {
      return;
    }

    if (isPromise(source)) {
      return yield* eachSource(await source);
    }

    if (isFragmentVNode(source)) {
      return yield* source.children ?? [];
    }

    if (isVNode(source)) {
      return yield Object.freeze([
        source
      ]);
    }

    // These need further processing through createVNodeWithContext
    if (isSourceReference(source) || isMarshalledVNode(source) || isIterableIterator(source)) {
      return yield* eachSource(createNode(source));
    }

    return yield* childrenUnion(
      asyncExtendedIterable(source).map(eachSource)
    );
  }

  if (source.length === 1) {
    return yield* eachSource(source[0]);
  } else {
    return yield* childrenUnion(source.map(eachSource));
  }
}
