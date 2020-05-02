import * as O from 'optics-ts'

import { fromTraversable, Lens, Prism } from 'monocle-ts'
import { some } from 'fp-ts/lib/Option'

import * as L from 'partial.lenses'

import { array } from 'fp-ts/lib/Array'

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

const run = (fn: () => any) => {
  for (let i = 0; i < repeat; i++) fn()
}

const repeat = 1000 //50000

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

describe('prism into array', () => {
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

  it('partial.lens', () => {
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

describe('prism modify array', () => {
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

  it('partial.lens', () => {
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
