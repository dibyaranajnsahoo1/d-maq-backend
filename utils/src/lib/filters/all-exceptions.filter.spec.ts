import { AllExceptionsFilter } from './all-exceptions.filter';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';

function createMockHost(url = '/test'): ArgumentsHost {
  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const mockRequest = { url };
  return {
    switchToHttp: () => ({
      getResponse: () => mockResponse,
      getRequest: () => mockRequest,
    }),
  } as unknown as ArgumentsHost;
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    filter = new AllExceptionsFilter();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should handle HttpException with 404 status', () => {
    const host = createMockHost();
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

    filter.catch(exception, host);

    const response = host.switchToHttp().getResponse() as any;
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: 'Not Found' }),
    );
  });

  it('should handle generic Error as 500', () => {
    const host = createMockHost();
    const exception = new Error('Something broke');

    filter.catch(exception, host);

    const response = host.switchToHttp().getResponse() as any;
    expect(response.status).toHaveBeenCalledWith(500);
  });

  it('should handle Mongo connection error as 503', () => {
    const host = createMockHost();
    const exception = new Error('MongoNetworkError: connect ECONNREFUSED');

    filter.catch(exception, host);

    const response = host.switchToHttp().getResponse() as any;
    expect(response.status).toHaveBeenCalledWith(503);
    const jsonCall = response.json.mock.calls[0][0];
    expect(jsonCall.statusCode).toBe(503);
    expect(jsonCall.error).toBe('Service Unavailable');
  });

  it('should include timestamp and path in response', () => {
    const host = createMockHost('/api/tasks');
    const exception = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);

    filter.catch(exception, host);

    const response = host.switchToHttp().getResponse() as any;
    const jsonCall = response.json.mock.calls[0][0];
    expect(jsonCall).toHaveProperty('timestamp');
    expect(jsonCall.path).toBe('/api/tasks');
  });
});
