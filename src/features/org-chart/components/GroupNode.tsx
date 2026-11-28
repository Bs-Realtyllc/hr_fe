'use client';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { memo } from 'react';
import type { GroupFlowNode } from '../utils/layout';
import GroupCard from './GroupCard';
import NodeToggle from './NodeToggle';

/** React Flow wrapper around GroupCard: edge anchors and the collapse toggle. */
function GroupNode({ id, data }: NodeProps<GroupFlowNode>) {
  return (
    <div className="org-node">
      <Handle type="target" position={Position.Top} isConnectable={false} className="org-handle" />
      <GroupCard variant={data.variant} name={data.name} summary={data.summary} />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className="org-handle"
      />
      <NodeToggle
        id={id}
        label={data.name}
        childCount={data.childCount}
        collapsed={data.collapsed}
        hiddenCount={data.hiddenCount}
      />
    </div>
  );
}

export default memo(GroupNode);
