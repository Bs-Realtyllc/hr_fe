'use client';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { memo } from 'react';
import type { GroupFlowNode } from '../utils/layout';
import GroupCard from './GroupCard';

/** React Flow wrapper around GroupCard: adds the edge anchor points. */
function GroupNode({ data }: NodeProps<GroupFlowNode>) {
  return (
    <>
      <Handle type="target" position={Position.Top} isConnectable={false} className="org-handle" />
      <GroupCard variant={data.variant} name={data.name} summary={data.summary} />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className="org-handle"
      />
    </>
  );
}

export default memo(GroupNode);
