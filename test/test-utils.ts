export function snapHtml(html: string): string {
  return html.replace(/<!--\?lit\$\d+\$-->/g, "<!--?-->").replace(/lit\$\d+\$/g, "lit$");
}

export const NOW = new Date("2026-11-20T12:00:00Z").getTime();

export function minsAgo(mins: number): string {
  return new Date(NOW - mins * 60000).toUTCString();
}
