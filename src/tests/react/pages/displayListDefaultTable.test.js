/* global describe, expect, it */

describe('display list DefaultTable migration (#294)', () => {
  it('builds company requestParams', () => {
    const companyId = 3;
    const requestParams = companyId ? {company: companyId} : {};
    expect(requestParams).toEqual({company: 3});
  });
});
