"use client";

import {useState} from "react";
import {HStack} from "@astryxdesign/core/HStack";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import {Selector} from "@astryxdesign/core/Selector";
import {Text} from "@astryxdesign/core/Text";
import {TextInput} from "@astryxdesign/core/TextInput";
import {usePathname, useRouter} from "next/navigation";

export type ListScope = {
  key: string;
  label: string;
  value: string;
  options: ReadonlyArray<{value: string; label: string}>;
};

export type ListSelectFilter = {
  key: string;
  label: string;
  value: string;
  allLabel: string;
  options: ReadonlyArray<{value: string; label: string}>;
};

/**
 * One toolbar row above a list: full-text search, a segmented scope, and
 * compact select filters. Filters write to the query string and always reset
 * pagination, so the visible rows and any totals agree with what is on screen.
 */
export function ListToolbar({
  search,
  scope,
  filters = [],
  preserve,
  summary,
}: {
  search?: {
    key?: string;
    value: string;
    label: string;
    placeholder?: string;
  };
  scope?: ListScope;
  filters?: ListSelectFilter[];
  preserve?: Record<string, string>;
  summary?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const propValue = search?.value ?? "";
  const [draft, setDraft] = useState({value: propValue, base: propValue});
  // Keep the input in step with the server value after navigation without an
  // effect: a new prop value wins over an unsubmitted draft.
  const query = draft.base === propValue ? draft.value : propValue;

  function apply(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams(preserve);

    const values: Record<string, string> = {};
    if (search && query.trim()) values[search.key ?? "search"] = query.trim();
    if (scope && scope.value) values[scope.key] = scope.value;
    for (const filter of filters) {
      if (filter.value) values[filter.key] = filter.value;
    }

    for (const [key, value] of Object.entries({...values, ...overrides})) {
      if (value) params.set(key, value);
      else params.delete(key);
    }

    params.delete("page");
    const next = params.toString();
    router.push(next ? `${pathname}?${next}` : pathname);
  }

  return (
    <HStack gap={3} justify="between" align="end" wrap="wrap" width="100%">
      <HStack gap={3} align="end" wrap="wrap">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            apply({});
          }}
        >
          {search ? (
            <TextInput
              label={search.label}
              isLabelHidden
              value={query}
              onChange={(value) => setDraft({value, base: propValue})}
              placeholder={search.placeholder}
              startIcon="search"
              hasClear
              width={280}
            />
          ) : null}
        </form>

        {scope ? (
          <SegmentedControl
            label={scope.label}
            value={scope.value}
            onChange={(value) => apply({[scope.key]: value})}
          >
            {scope.options.map((option) => (
              <SegmentedControlItem
                key={option.value}
                value={option.value}
                label={option.label}
              />
            ))}
          </SegmentedControl>
        ) : null}

        {filters.map((filter) => (
          <Selector
            key={filter.key}
            label={filter.label}
            isLabelHidden
            variant="secondary"
            value={filter.value}
            onChange={(value) => apply({[filter.key]: value})}
            options={[
              {value: "", label: filter.allLabel},
              ...filter.options,
            ]}
          />
        ))}
      </HStack>

      {summary ? (
        <Text type="supporting" color="secondary">
          {summary}
        </Text>
      ) : null}
    </HStack>
  );
}
