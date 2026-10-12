// Holds the backend JWT. Kept in memory and mirrored to sessionStorage so a page
// refresh keeps you signed in; it's cleared when the browser tab is closed.
const TOKEN = "bombay-auth-token";
const USER = "bombay-auth-user";
let memToken: string | null = null;
let memUser: string | null = null;
const ss = () => (typeof window !== "undefined" ? window.sessionStorage : null);

export const tokenStore = {
  getToken: () => memToken ?? ss()?.getItem(TOKEN) ?? null,
  getUser: () => memUser ?? ss()?.getItem(USER) ?? null,
  set: (token: string, user: unknown) => {
    memToken = token;
    memUser = JSON.stringify(user);
    ss()?.setItem(TOKEN, memToken);
    ss()?.setItem(USER, memUser);
  },
  clear: () => {
    memToken = memUser = null;
    ss()?.removeItem(TOKEN);
    ss()?.removeItem(USER);
  },
};
