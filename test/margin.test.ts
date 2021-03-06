import * as O from 'optics-ts'

interface Test {
  children: Record<string, string>
}

const test1: Test = {
  children: {
    s1: 'Luke',
    s2: 'Lucy',
  },
}

describe('optics-ts', () => {
  it('remove (intended to fail)', () => {
    // Used any to skip type safty check.
    // The problem was found when using lens as cursor to navigate a recursive
    // data strucutre, which uses `any` for focus on different types of field.
    const lens: any = O.optic<Test>().path(['children', 's1'])
    const _test1 = O.remove<Test>(lens)(test1)
    expect(_test1).toEqual({
      children: {
        s2: 'Lucy',
      },
    })
  })
})
