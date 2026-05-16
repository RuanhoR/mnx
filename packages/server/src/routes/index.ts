import { env } from 'cloudflare:workers';
import ResponseFrame from '../framework';
import { json } from '../framework-utils';
import { RegisterTokenRouter } from './token';
import { RegerPUblishRouter } from './publish';
import { RegisterScopeRouter } from './scope';
import { Auth } from '../auth';
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
		const sessionData = await env.BLOG_DATA.get(`publish-session:${session}`);
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
		if (await env.BLOG_DATA.get(cacheKey)) {
			await env.BLOG_DATA.delete(cacheKey);
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
		const uidString = await env.BLOG_DATA.get(`user-token:${token}`);
		if (!uidString) {
			return json({
				code: -1,
				data: 'invalid token',
			});
		}

		const uid = parseInt(uidString);
		if (isNaN(uid)) {
			return json({
				code: -1,
				data: 'invalid user data',
			});
		}

		const userResult = await Auth.find({ id: uid });
		if (!userResult.data || userResult.data.length === 0) {
			return json({
				code: -1,
				data: 'user not found',
			});
		}

		const user = userResult.data[0];
		const userWithToken = { ...user, token };
		c.paramMap.set('__user', JSON.stringify(userWithToken));
		return await next();
	});
	frame.use('/unpublish/', commonPublicVerify(TokenPermission.unpublish));
	frame.use('/publish/', commonPublicVerify(TokenPermission.publish));
	RegisterTokenRouter(frame);
	RegerPUblishRouter(frame);
	RegisterScopeRouter(frame);
}
