import { VContext, Tree } from "./vcontext";
import { VNode } from "./vnode";
import { asyncExtendedIterable } from "iterable";

export async function hydrateChildren<C extends VContext>(context: C, node: VNode, tree?: Tree) {
  // This will continue until there are no more generated children for a node
  //
  // This allows values to be hydrated every time there is a new set of children instance
  //
  // At a top level this means that if we still have children being generated, we're still
  // going to be waiting for it to complete
  await asyncExtendedIterable(node.children)
    .forEach(async nextChildren => {
      // We want to grab the snapshot of the current children into an array
      // This allows us to trigger the entire tree to hydrate at the same time meaning
      // we don't need to wait for "slow" nodes
      //
      // Get us much done as we can as quick as we can
      const childrenArray = await asyncExtendedIterable(nextChildren).toArray();

      // Create a tree so that hydrators can "figure out" where they are
      //
      // We want this information to be as simple as possible, which means only
      // recording the references being used
      // rather than passing vnode references around
      //
      // We want those vnodes to be as weakly referenced as possible because
      // they're just a state snapshot
      const nextTree: Tree = {
        children: Object.freeze(
          childrenArray
            .map(child => child ? child.reference : undefined)
        ),
        parent: tree,
        reference: node.reference
      };

      await Promise.all(
        childrenArray.map(child => hydrate(context, child, nextTree))
      );
    });
}

export async function hydrate<C extends VContext>(context: C, node: VNode, tree?: Tree) {
  if (!context.hydrate) {
    return; // Nothing to do, can never hydrate
  }
  return context.hydrate(node, tree, node.children ? () => hydrateChildren(context, node, tree) : undefined);
}
