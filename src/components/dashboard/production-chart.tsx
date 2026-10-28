"use client";

import {Card} from "@astryxdesign/core/Card";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {useLocale} from "next-intl";
import type {HomeProductionPoint} from "@/lib/dto";

export function ProductionChart({
  data,
  title,
  intro,
  label,
}: {
  data: HomeProductionPoint[];
  title: string;
  intro: string;
  label: string;
}) {
  const locale = useLocale();
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
    }).format(new Date(`${value}T00:00:00.000Z`));

  return (
    <Card padding={5} height="100%">
      <Stack gap={4}>
        <Stack gap={1}>
          <Heading level={3}>{title}</Heading>
          <Text color="secondary">{intro}</Text>
        </Stack>
        <Stack height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{top: 8, right: 8, bottom: 0, left: 0}}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <Tooltip
                formatter={(value) => [value, label]}
                labelFormatter={(value) => formatDate(String(value))}
              />
              <Bar
                dataKey="completed"
                fill="var(--color-accent)"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </Stack>
      </Stack>
    </Card>
  );
}
