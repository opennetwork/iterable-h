import { VNode } from "./vnode";
import { MergeOptions } from "@opennetwork/progressive-merge";
import { Input } from "@opennetwork/progressive-merge/dist/async";
import { childrenUnion } from "./children";

export async function *childrenFiltered<Node extends VNode = VNode>(node: VNode, isNode: (node: VNode) => node is Node, options: MergeOptions = {}): AsyncIterable<Node[]> {
  if (!node.children) return;
  for await (const children of node.children) {
    if (!children.length) {
      yield []; // Intentional empty yield
    } else if (children.every((node): node is Node => isNode(node))) {
      yield [...children];
    } else {
      yield *childrenUnion(options, children.map(sourcesChildren));
    }
  }
  function sourcesChildren(node: VNode): Input<Node[]> {
    return isNode(node) ? [[node]] : childrenFiltered(node, isNode, options);
  }
}
