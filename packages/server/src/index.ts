import ResponseFrame from './framework';
import { RegerRoutes } from './routes';

export default {
	async fetch(request: Request): Promise<Response> {
		const res = new ResponseFrame(request);
		RegerRoutes(res);
		return await res.handlerRequest();
	},
};
