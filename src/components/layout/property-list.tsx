import type {ReactNode} from "react";
import {
  MetadataList,
  MetadataListItem,
} from "@astryxdesign/core/MetadataList";

export type Property = {
  label: string;
  value: ReactNode;
};

/**
 * Key/value facts for a record. Wraps Astryx MetadataList so record pages stop
 * re-declaring the same Grid of label/value stacks.
 */
export function PropertyList({
  items,
  columns = "multi",
  labelPosition = "top",
}: {
  items: Property[];
  columns?: "multi" | "single" | number;
  labelPosition?: "start" | "top";
}) {
  return (
    <MetadataList columns={columns} label={{position: labelPosition}}>
      {items.map((item) => (
        <MetadataListItem key={item.label} label={item.label}>
          {item.value}
        </MetadataListItem>
      ))}
    </MetadataList>
  );
}
