'use client';
/**
 * ADMIN1.5 — one pager, and it tells the truth about where you are.
 *
 * The Users and Deeds tabs each carried their own copy of:
 *
 *     Page {page} / {Math.max(1, Math.ceil(total/limit))}
 *     <button disabled={page*limit>=total}>Next</button>
 *
 * Three problems, all small, all the kind that make an operator distrust
 * a console:
 *
 * 1. `Math.max(1, …)` reported "Page 1 / 1" over an empty result set —
 *    a page that does not exist, announced with confidence.
 * 2. The page number came from local state and the total from the last
 *    response, so during a filter change the header could read
 *    "Page 3 / 1" while the table below showed nothing. The count and
 *    the position were describing different result sets.
 * 3. The total was never shown. "Page 2 of 4" is a worse answer than
 *    "Page 2 of 4 · 87 users" for every question an admin actually has.
 *
 * The fix is not cleverness — it is refusing to render a position when
 * there is nothing to be positioned in.
 */
type PagerProps = {
  page: number;
  /** Total pages, unclamped: 0 when there are no results at all. */
  pageCount: number;
  total: number;
  /** Singular noun for the row type, e.g. "user" — pluralised here. */
  noun: string;
  loading?: boolean;
  onPage: (next: number) => void;
};

export default function Pager({ page, pageCount, total, noun, loading, onPage }: PagerProps){
  const empty = total === 0;
  return (
    <div className="hstack">
      <div style={{opacity:.7, fontSize:13}}>
        {loading ? 'Loading…' : empty ? (
          `No ${noun}s`
        ) : (
          <>Page {Math.min(page, pageCount)} of {pageCount} · {total} {noun}{total === 1 ? '' : 's'}</>
        )}
      </div>
      <button
        className="button ghost"
        onClick={()=> onPage(Math.max(1, page - 1))}
        disabled={loading || page <= 1}
      >Prev</button>
      <button
        className="button"
        onClick={()=> onPage(page + 1)}
        disabled={loading || empty || page >= pageCount}
      >Next</button>
    </div>
  );
}
