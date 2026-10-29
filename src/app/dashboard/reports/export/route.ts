import {getActorContext} from "@/server/auth/actor";
import {isGranted} from "@/server/auth/guards";
import {normalizeProfitabilitySort} from "@/lib/profitability";
import {reportService} from "@/server/services/container";
import {normalizePeriod} from "@/server/services/home.service";

function cell(value: string | number | null): string {
  if (value === null) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function row(values: Array<string | number | null>): string {
  return values.map(cell).join(",");
}

export async function GET(request: Request): Promise<Response> {
  const actor = await getActorContext();
  if (!actor) return new Response("Unauthorized", {status: 401});
  if (!isGranted(actor, "report:finance")) {
    return new Response("Forbidden", {status: 403});
  }

  const url = new URL(request.url);
  const period = normalizePeriod(url.searchParams.get("period") ?? undefined);
  const sort = normalizeProfitabilitySort(
    url.searchParams.get("sort") ?? undefined,
  );
  const report = await reportService.getReports(actor, {period, sort});

  const lines = [
    row([
      "item_code",
      "item_name",
      "category",
      "produced",
      "sold",
      "unsold",
      "waste",
      "revenue",
      "contribution",
      "margin_pct",
      "loss_rate_pct",
      "unsold_rate_pct",
      "currency",
    ]),
    ...report.profitability.map((record) =>
      row([
        record.itemCode,
        record.itemName,
        record.categoryName,
        record.produced,
        record.sold,
        record.unsold,
        record.waste,
        record.revenue,
        record.contribution,
        record.marginPct,
        record.lossRatePct,
        record.unsoldRatePct,
        record.currency,
      ]),
    ),
  ];

  return new Response(`\uFEFF${lines.join("\n")}\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="profitability.csv"',
      "cache-control": "no-store",
    },
  });
}
