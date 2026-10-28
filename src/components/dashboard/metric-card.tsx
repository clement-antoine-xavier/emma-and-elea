"use client";

import {Badge} from "@astryxdesign/core/Badge";
import {Card} from "@astryxdesign/core/Card";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {Line, LineChart, ResponsiveContainer} from "recharts";

export type MetricChange = {
  value: string;
  positive: boolean;
};

export function MetricCard({
  label,
  value,
  hint,
  change,
  sparkline,
}: {
  label: string;
  value: string;
  hint?: string;
  change?: MetricChange | null;
  sparkline?: number[];
}) {
  const data = (sparkline ?? []).map((point, index) => ({index, point}));

  return (
    <Card padding={5} height="100%">
      <Stack gap={2}>
        <Text type="label" color="secondary">
          {label}
        </Text>
        <HStack gap={2} align="end" wrap="wrap">
          <Heading level={2}>{value}</Heading>
          {change ? (
            <Badge
              variant={change.positive ? "success" : "error"}
              label={change.value}
            />
          ) : null}
        </HStack>
        {hint ? (
          <Text type="supporting" color="secondary">
            {hint}
          </Text>
        ) : null}
        {data.length > 1 ? (
          <Stack height={40}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <Line
                  type="monotone"
                  dataKey="point"
                  dot={false}
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}
