"use client";

import {Card} from "@astryxdesign/core/Card";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {useLocale} from "next-intl";
import {formatMoney} from "@/lib/format";
import type {HomeSalesPoint} from "@/lib/dto";

export function RevenueChart({
  data,
  title,
  intro,
  currency,
}: {
  data: HomeSalesPoint[];
  title: string;
  intro: string;
  currency: string;
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
            <AreaChart
              data={data}
              margin={{top: 8, right: 8, bottom: 0, left: 0}}
            >
              <defs>
                <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-accent)"
                    stopOpacity={0.28}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-accent)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
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
                tickFormatter={(value: number) =>
                  formatMoney(value, {
                    locale,
                    currency,
                    maximumFractionDigits: 0,
                    minimumFractionDigits: 0,
                  })
                }
                tickLine={false}
                axisLine={false}
                width={72}
              />
              <Tooltip
                formatter={(value) =>
                  formatMoney(String(value), {locale, currency})
                }
                labelFormatter={(label) => formatDate(String(label))}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-accent)"
                strokeWidth={2}
                fill="url(#revenue-fill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Stack>
      </Stack>
    </Card>
  );
}
