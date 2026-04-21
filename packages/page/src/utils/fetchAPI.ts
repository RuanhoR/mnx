export async function fetchAPI(path: string, data: object, method: string = "POST", apiBase: string, token?: string,) {
  const fetchConfig = {
    method: method,
    credentials: "include",
    headers: {}
  } as RequestInit;
  if (data instanceof FormData) {
    fetchConfig.body = data;
  } else {
    if (method.toUpperCase() === "GET" || method.toUpperCase() === "HEAD") {
      const url = new URL(`${apiBase}${path.startsWith("/") ? path : '/' + path}`);
      Object.keys(data).forEach(key => url.searchParams.append(key, (data as any)[key]));
      path = url.pathname + url.search;
    } else {
      fetchConfig.headers = {
        "Content-Type": "application/json; charset=utf-8"
      };
      fetchConfig.body = JSON.stringify(data);
    }
  }

  if (token && token.length > 0) {
    if (!fetchConfig.headers) {
      fetchConfig.headers = {};
    }
    (fetchConfig.headers as Record<string, string>).Authorization = "Bearer " + token;
  }

  const f = await fetch(`${apiBase}${path.startsWith("/") ? path : '/' + path}`, fetchConfig);
  const jsonResponse = await f.json();
  return {
    status: f.status,
    code: jsonResponse.code,
    data: jsonResponse.data,
    ok: f.ok
  };
}