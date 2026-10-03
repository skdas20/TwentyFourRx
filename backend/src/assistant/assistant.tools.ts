import { FunctionDeclaration, Type } from '@google/genai';

/** Tools executed in the user's browser (relayed to the widget). */
export const CLIENT_TOOLS: FunctionDeclaration[] = [
  {
    name: 'read_page',
    description:
      'Read the current page: path, title, highlightable elements (assist ids with labels) and form fields with current values.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'navigate',
    description: 'Open a page of the 24Rx website. Only use paths from the route list in your knowledge.',
    parameters: {
      type: Type.OBJECT,
      properties: { path: { type: Type.STRING, description: 'Site path, e.g. /portfolio' } },
      required: ['path'],
    },
  },
  {
    name: 'highlight',
    description:
      'Spotlight one element on the page (scrolls it into view) with an optional short caption shown next to it.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        target: { type: Type.STRING, description: 'The data-assist id from read_page, e.g. qa-sell' },
        caption: { type: Type.STRING, description: 'Optional caption, max ~8 words' },
      },
      required: ['target'],
    },
  },
  {
    name: 'clear_highlight',
    description: 'Remove the current spotlight.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'scroll_to',
    description: 'Scroll the page to an element, or up/down/top/bottom.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        target: { type: Type.STRING, description: 'A data-assist id, or one of: up, down, top, bottom' },
      },
      required: ['target'],
    },
  },
  {
    name: 'fill_field',
    description:
      'Type a value the user dictated into a form field (text, number, date YYYY-MM-DD, textarea or dropdown). Cannot fill passwords or choose files.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        field: { type: Type.STRING, description: 'The field assist id from read_page, e.g. field-gstin' },
        value: { type: Type.STRING, description: 'Exact value to enter' },
      },
      required: ['field', 'value'],
    },
  },
];

/** Tools executed on the server against the logged-in user's own records (read-only). */
export const DATA_TOOLS: FunctionDeclaration[] = [
  {
    name: 'get_my_account',
    description: "The user's account status and every KYC document with its status and the admin's rejection note.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'get_my_selling',
    description:
      "The user's listings (by status), pending medicine proposals, bulk upload requests, and buy requests awaiting their confirmation as seller.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'get_my_buying',
    description: "The user's buy proposals as a buyer (latest first) and their portfolio holdings.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'get_my_deliveries',
    description: 'Physical delivery requests where the user is the buyer, and where the user is the seller.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'get_my_notifications',
    description: "The user's most recent notifications (unread first).",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'get_my_support_tickets',
    description: "The user's support tickets with status and admin responses.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
];

export const CLIENT_TOOL_NAMES = new Set(CLIENT_TOOLS.map((t) => t.name!));
export const DATA_TOOL_NAMES = new Set(DATA_TOOLS.map((t) => t.name!));
