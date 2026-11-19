'use client';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { memo } from 'react';
import type { PersonFlowNode } from '../utils/layout';
import PersonCard from './PersonCard';
import { useCurrentUserId } from './currentUser';

/** React Flow wrapper around PersonCard: adds the edge anchor points. */
function PersonNode({ data }: NodeProps<PersonFlowNode>) {
  const { member, directCount, totalCount } = data;
  const meId = useCurrentUserId();
  return (
    <>
      <Handle type="target" position={Position.Top} isConnectable={false} className="org-handle" />
      <PersonCard
        member={member}
        directCount={directCount}
        totalCount={totalCount}
        isMe={meId === member.id}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className="org-handle"
      />
    </>
  );
}

export default memo(PersonNode);
