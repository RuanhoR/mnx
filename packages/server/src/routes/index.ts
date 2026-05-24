import ResponseFrame, { KV, config } from '../framework';
import { json } from '../framework-utils';
import { RegisterTokenRouter } from './token';
import { RegerPUblishRouter } from './publish';
import { RegisterScopeRouter } from './scope';
import { PublishManager } from '../publish/publish';
import { TokenPermission } from '../publish/token';
import { Middleware } from '../types';

async function resolvePublishScopeName(c: Parameters<Middleware>[0]): Promise<string | null> {
	if (c.paramMap.has('scope') && c.paramMap.has('name')) {
		const scope = c.paramMap.get('scope') as string;
		const name = c.paramMap.get('name') as string;
		return `${scope}/${name}`;
	}

	if (c.paramMap.has('session')) {
		const session = c.paramMap.get('session') as string;
		const sessionData = await KV.get(`publish-session:${session}`);
		if (!sessionData) return null;
		const parsed = JSON.parse(sessionData) as { metadata?: { scope?: string; name?: string } };
		const scope = parsed?.metadata?.scope;
		const name = parsed?.metadata?.name;
		if (!scope || !name) return null;
		const normalizedScope = scope.startsWith('@') ? scope : `@${scope}`;
		return `${normalizedScope}/${name}`;
	}

	return null;
}

function commonPublicVerify(permisson: TokenPermission): Middleware {
	return async (c, next) => {
		const _token = c.request.headers.get('Authorization');
		if (!_token || !_token.startsWith('Bearer '))
			return json({
				code: -1,
				data: 'this route must have token',
			});
		const scopeName = await resolvePublishScopeName(c);
		if (!scopeName)
			return json({
				code: -1,
				data: 'not found',
			});
		const token = _token.slice(7);
		const verifyResult = await PublishManager.verifyToken(token, permisson, scopeName);
		if (!verifyResult)
			return json(
				{
					code: -1,
					data: 'verify failed',
				},
				400,
			);
		c.paramMap.set('__user', JSON.stringify(verifyResult));
		return await next();
	};
}
export function RegerRoutes(frame: ResponseFrame) {
	PublishManager.registerHook(async (user, scope, name) => {
		const cacheKey = `account:publish:list:${user.uid}`;
		if (await KV.get(cacheKey)) {
			await KV.delete(cacheKey);
		}
	});

	frame.use('/account', async (c, next) => {
		const _token = c.request.headers.get('Authorization');
		if (!_token || !_token.startsWith('Bearer '))
			return json({
				code: -1,
				data: 'this route must have token',
			});
		const token = _token.slice(7);

		const accountRes = await fetch(`${config.accountApiHost}/serive/v0/self_info`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
		});
		const accountResult = (await accountRes.json()) as { code: number; data?: any };
		if (!accountResult || accountResult.code !== 200 || !accountResult.data) {
			return json({
				code: -1,
				data: 'invalid token',
			});
		}

		const userWithToken = { ...accountResult.data, token };
		c.paramMap.set('__user', JSON.stringify(userWithToken));
		return await next();
	});
	frame.use('/unpublish/', commonPublicVerify(TokenPermission.unpublish));
	frame.use('/publish/', commonPublicVerify(TokenPermission.publish));
	frame.post('/oauth/token', async (_data, request) => {
		const body = await request.json().catch(() => ({}));
		const accountRes = await fetch(`${config.accountApiHost}/oauth/token`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});
		const result = await accountRes.json();
		return json(result as object, accountRes.status);
	});
	frame.post('/serive/v0/logout', async (_data, request) => {
		const _token = request.headers.get('Authorization');
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		if (_token) headers['Authorization'] = _token;

		const accountRes = await fetch(`${config.accountApiHost}/serive/v0/logout`, {
			method: 'POST',
			headers,
			body: '{}',
		});
		const result = await accountRes.json();
		return json(result as object, accountRes.status);
	});
	frame.post('/serive/v0/self_info', async (_data, request) => {
		const _token = request.headers.get('Authorization');
		if (!_token || !_token.startsWith('Bearer '))
			return json({
				code: -1,
				data: 'this route must have token',
			});
		const token = _token.slice(7);

		const accountRes = await fetch(`${config.accountApiHost}/serive/v0/self_info`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
		});
		const accountResult = (await accountRes.json()) as { code: number; data?: any };
		if (!accountResult || accountResult.code !== 200 || !accountResult.data) {
			return json({
				code: -1,
				data: 'invalid token',
			});
		}

		const { password, friends, friends_request, ...userData } = accountResult.data;
		return json({
			code: 200,
			data: userData,
		});
	});
	RegisterTokenRouter(frame);
	RegerPUblishRouter(frame);
	RegisterScopeRouter(frame);
}
