# Summary

I need to pick a JS/TS optics library for a project. After some initial research, I narrowed down to three candidates: [partial.lenses](https://github.com/calmm-js/partial.lenses.git), [monocle-ts](https://github.com/gcanti/monocle-ts.git), [optics-ts](https://github.com/akheron/optics-ts.git).

As my project is going to manipulate dataset with certain size, I ran some benchmarks, on four operations I cared the most:

- read by lens
- modify by lens
- read array element by predicate
- modify array element by predicate

The result is as below. It looks partial.lenses excels in read while optics-ts excels in write. Monocle-ts as a library is very mature in function and design. But it looks it needs some tuning for performance.

If anyone, esp. the maintainers, think the benchmark code needs to be tuned to best use the library, you are welcome to raise an issue or pull request.

And pull requests to add more test cases are welcome.

**Jest run result on May 9, 2020, with optics-ts version 1.1.3-pre3**

See huge improvement in prsim array read / write with `find`.

```
  read
    ✓ optics-ts (4ms)
    ✓ monocle-ts (1ms)
    ✓ partial.lenses (3ms)
  write
    ✓ optics-ts (4ms)
    ✓ monocle-ts (7ms)
    ✓ partial.lenses (14ms)
  prism read array element by predicate
    ✓ optics-ts (39ms)
    ✓ monocle-ts (218ms)
    ✓ partial.lenses (5ms)
  prism modify array element by predicate
    ✓ optics-ts (45ms)
    ✓ monocle-ts (29993ms)
    ✓ partial.lenses (360ms)
```

**Jest run result**

```
  read
    ✓ optics-ts (4ms)
    ✓ monocle-ts (1ms)
    ✓ partial.lenses (3ms)
  write
    ✓ optics-ts (3ms)
    ✓ monocle-ts (4ms)
    ✓ partial.lenses (13ms)
  prism read array element by predicate
    ✓ optics-ts (70ms)
    ✓ monocle-ts (220ms)
    ✓ partial.lenses (6ms)
  prism modify array element by predicate
    ✓ optics-ts (214ms)
    ✓ monocle-ts (31227ms)
    ✓ partial.lenses (344ms)
```

To run the test:

```
git clone https://github.com/nodeshapes/js-optics-benchmark.git
yarn
yarn test
```

## Dataset

```
const size = 5000
const mid = Math.floor(size / 2)
const id = 'id-' + mid
const name = 'Luke-' + mid
const nameModified = 'Luke-' + mid + '-modified'

const makeNames = () => {
  const arr = []
  for (let i = 0; i < size; i++)
    arr.push({
      id: 'id-' + i,
      name: 'Luke-' + i,
    })

  return arr
}

const data = {
  a: {
    b: {
      c: { d: { e: 'hello' } },
    },
  },

  m: {
    n: {
      names: makeNames(),
    },
  },
}

```

Test code for Jest

```
import * as O from 'optics-ts'

import { fromTraversable, Lens, Prism } from 'monocle-ts'
import { some } from 'fp-ts/lib/Option'

import * as L from 'partial.lenses'

import { array } from 'fp-ts/lib/Array'


const repeat = 1000 //50000

const run = (fn: () => any) => {
  for (let i = 0; i < repeat; i++) fn()
}

describe('read', () => {
  it('optics-ts', () => {
    const optics = O.optic<any>().path(['a', 'b', 'c', 'd', 'e'])
    let r = undefined
    const fn = () => (r = O.get(optics)(data))
    run(fn)
    expect(r).toEqual('hello')
  })

  it('monocle-ts', () => {
    const optics = Lens.fromPath<any>()(['a', 'b', 'c', 'd', 'e'])
    let r = undefined
    const fn = () => (r = optics.get(data))
    run(fn)
    expect(r).toEqual('hello')
  })

  it('partial.lenses', () => {
    const optics = L.compose(['a', 'b', 'c', 'd', 'e'])
    let r = undefined
    const fn = () => (r = L.get(optics, data))
    run(fn)
    expect(r).toEqual('hello')
  })
})

describe('write', () => {
  it('optics-ts', () => {
    const optics = O.optic<any>().path(['a', 'b', 'c', 'd', 'e'])
    let r = undefined
    const fn = () => (r = O.modify(optics)(() => 'world')(data))
    run(fn)
    expect(O.get(optics)(r)).toEqual('world')
  })

  it('monocle-ts', () => {
    const optics = Lens.fromPath<any>()(['a', 'b', 'c', 'd', 'e'])
    let r = undefined
    const fn = () => (r = optics.modify(() => 'world')(data))
    run(fn)
    expect(optics.get(r)).toEqual('world')
  })

  it('partial.lenses', () => {
    const optics = L.compose(['a', 'b', 'c', 'd', 'e'])
    let r = undefined
    const fn = () => (r = L.set(optics, 'world', data))
    run(fn)
    expect(L.get(optics, r)).toEqual('world')
  })
})

describe('prism read array element by predicate', () => {
  it('optics-ts', () => {
    const optics = O.optic<any>()
      .path(['m', 'n', 'names'])
      .elems()
      .when((name: any) => name.id === id)
    let r = undefined
    const fn = () => (r = O.preview(optics)(data))
    run(fn)
    expect(r).toEqual({ id, name })
  })

  it('monocle-ts', () => {
    const getChildPrism = (id: string) =>
      Prism.fromPredicate((child: any) => child.id === id)
    const childTraversal = fromTraversable(array)<any>()

    const optics = Lens.fromPath<any>()(['m', 'n', 'names'])
      .composeTraversal(childTraversal)
      .composePrism(getChildPrism(id))
      .asFold()

    let r = undefined
    const fn = () => (r = optics.headOption(data))
    run(fn)
    expect(r).toEqual(some({ id, name }))
  })

  it('partial.lenses', () => {
    const optics = L.compose(
      L.prop('m'),
      L.prop('n'),
      L.prop('names'),
      L.find((name: any) => name.id === id),
      L.valueOr(undefined)
    )
    let r = undefined
    const fn = () => (r = L.get(optics, data))
    run(fn)
    expect(r).toEqual({ id, name })
  })
})

describe('prism modify array element by predicate', () => {
  it('optics-ts', () => {
    const optics = O.optic<any>()
      .path(['m', 'n', 'names'])
      .elems()
      .when((name: any) => name.id === id)
    let r = undefined
    const fn = () =>
      (r = O.modify(optics)((s: any) => ({ ...s, name: nameModified }))(data))
    run(fn)

    let w = O.preview(optics)(r)
    expect(w).toEqual({ id, name: nameModified })
  })

  it('monocle-ts', () => {
    const getChildPrism = (id: string) =>
      Prism.fromPredicate((child: any) => child.id === id)
    const childTraversal = fromTraversable(array)<any>()

    const optics = Lens.fromPath<any>()(['m', 'n', 'names'])
      .composeTraversal(childTraversal)
      .composePrism(getChildPrism(id))

    let r = undefined
    const fn = () =>
      (r = optics.modify((s) => ({ ...s, name: nameModified }))(data))
    run(fn)
    let w = optics.asFold().headOption(r)

    expect(w).toEqual(some({ id, name: nameModified }))
  })

  it('partial.lenses', () => {
    const optics = L.compose(
      L.prop('m'),
      L.prop('n'),
      L.prop('names'),
      L.find((name: any) => name.id === id)
    )
    let r = undefined
    const fn = () =>
      (r = L.modify(optics, (s: any) => ({ ...s, name: nameModified }), data))
    run(fn)

    let w = L.get(optics, r)
    expect(w).toEqual({ id, name: nameModified })
  })
})

```
