import api, { fetchAllPages } from './client';

const records = (count, offset = 0) =>
  Array.from({ length: count }, (_, index) => ({ id: offset + index + 1 }));

const requestedOffsets = () => api.get.mock.calls.map(([, config]) => config.params.skip);

describe('fetchAllPages', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('loads every item beyond the first 100 with sequential offset requests', async () => {
    const allItems = records(205);
    let activeRequests = 0;
    let maxActiveRequests = 0;

    jest.spyOn(api, 'get').mockImplementation(async (_url, { params }) => {
      activeRequests += 1;
      maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
      await Promise.resolve();
      const page = allItems.slice(params.skip, params.skip + params.limit);
      activeRequests -= 1;
      return { data: page };
    });

    await expect(fetchAllPages('/api/items')).resolves.toEqual(allItems);
    expect(requestedOffsets()).toEqual([0, 100, 200]);
    expect(maxActiveRequests).toBe(1);
    expect(api.get.mock.calls.map(([, config]) => config.params.limit)).toEqual([100, 100, 100]);
  });

  test('requests an empty page when the result is exactly 100 items', async () => {
    const allItems = records(100);
    jest
      .spyOn(api, 'get')
      .mockResolvedValueOnce({ data: allItems })
      .mockResolvedValueOnce({ data: [] });

    await expect(fetchAllPages('/api/items')).resolves.toEqual(allItems);
    expect(requestedOffsets()).toEqual([0, 100]);
  });

  test('rejects a later page failure instead of returning a truncated array', async () => {
    const failure = new Error('last page failed');
    jest
      .spyOn(api, 'get')
      .mockResolvedValueOnce({ data: records(100) })
      .mockRejectedValueOnce(failure);

    await expect(fetchAllPages('/api/items')).rejects.toBe(failure);
    expect(requestedOffsets()).toEqual([0, 100]);
  });

  test('stops pagination when the shared signal is aborted', async () => {
    const controller = new AbortController();
    const signal = controller.signal;

    jest.spyOn(api, 'get').mockImplementationOnce(async () => {
      controller.abort();
      return { data: records(100) };
    });

    await expect(fetchAllPages('/api/items', { signal })).rejects.toMatchObject({
      code: 'ERR_CANCELED',
    });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/api/items', {
      params: { skip: 0, limit: 100 },
      signal,
    });
  });
});
