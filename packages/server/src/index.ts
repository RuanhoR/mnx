import ResponseFrame from './framework';
import { RegisterRoutes } from './routes';

export default {
	async fetch(request: Request): Promise<Response> {
		const res = new ResponseFrame(request);
		RegisterRoutes(res);
		return await res.handlerRequest();
	},
};
