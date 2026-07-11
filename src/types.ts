export type Plugin = "rss" | "polymarket";

export interface CardConfig {
  plugin: Plugin;
  entity: string;
  title?: string;
  limit?: number;
  market_limit?: number;
  height?: string;
}

export interface RssEntry {
  title: string;
  image?: string;
  picture?: string;
  last_updated?: number;
}

export interface RssAttributes {
  entries?: RssEntry[];
}

export interface PolyMarket {
  title: string;
  liquidity: number;
  volume24hr: number;
  winPrice: number;
}

export interface PolyEvent {
  title: string;
  icon: string;
  liquidity: number;
  volume24hr: number;
  endsAt: string;
  markets: PolyMarket[];
}

export interface PolymarketAttributes {
  scene?: number | string;
  events?: PolyEvent[];
}

export interface Hass {
  connection: {
    subscribeEvents(
      callback: (event: { data: { entity_id: string } }) => void,
      eventType: string
    ): Promise<() => void>;
  };
  states: Record<string, { attributes: RssAttributes | PolymarketAttributes } | undefined>;
}
