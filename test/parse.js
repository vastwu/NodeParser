const util = require('util')
const { expect } = require('chai')
const NodeParser = require('../lib/NodeParser')

const format = function (obj) {
  return util.inspect(obj, {
    depth: 30
  })
}

describe('解析和还原', function() {
  it('正确的识别注释的', function() {
    let content = '<p><img src="http://si1.go2yd.com/get-image/0KR4lcrSHw0" data-format="JPEG" title=""/></p>' +
                  '<p><!--[if lt IE 9]><p>您的浏览器版本过低，请<a href="http://browsehappy.com/">升级浏览器</a></p><![endif]--></p>' +
                  '<div>' +
                    '<p>《<strong>民航事儿</strong>》：1</p>' +
                  '</div>'
    const tree = NodeParser.parse(content)

    expect(tree.children.length).to.equal(3)
    expect(tree.children[0].tagName).to.equal('p')
    expect(tree.children[2].children[0].tagName).to.equal('p')

    const commentNode = tree.children[1].children[0];
    expect(commentNode.tagName).to.equal('text')
    expect(/^<!--/.test(commentNode.content)).to.equal(true)
    expect(/-->$/.test(commentNode.content)).to.equal(true)

    const html = tree.toHTML()
    expect(html.length).to.equal(content.length)
  })
  it('正确的识别content注释的', function() {
    let content = `<!--[if lt IE 9]><p>您的浏览器版本过低，请<a href=\"http://browsehappy.com/\">升级浏览器</a></p><![endif]-->` +
                  `<div>` +
                    `<p>《<strong>民航事儿</strong>》：1</p>` +
                  `</div>`
    const tree = NodeParser.parse(content)
    expect(tree.children.length).to.equal(2)

    const commentNode = tree.children[0]
    expect(commentNode.tagName).to.equal('text')
    expect(/^<!--/.test(commentNode.content)).to.equal(true)
    expect(/-->$/.test(commentNode.content)).to.equal(true)

    const html = tree.toHTML()
    expect(html.length).to.equal(content.length)
  })
  it('正确处理自闭合标签', function () {
    let content = `<p>船上很多人就已经和我<wbr>一样HIGH了起来。</p>`;
    const tree = NodeParser.parse(content)
    const html = tree.toHTML()
    expect(html.length).to.equal(33)
  })
  it('空内容', function () {
    let content = '';
    const tree = NodeParser.parse(content)
    const html = tree.toHTML()
    expect(html.length).to.equal(0)

  })
})
describe('修改', function() {
  it('删除空节点', async function () {
    let content = `<div>aaa<span class="remove"></span>ccc</div>`;
    const tree = NodeParser.parse(content)
    await tree.walk(function (node, next) {
      if (node.isEmpty()) {
        node.remove()
      }
      next()
    })
    const html = tree.toHTML()
    expect(html).to.equal('<div>aaaccc</div>')
  })
  it('修改节点类型', async function () {
    let content = `<div>aaa<b></b>ccc</div>`;
    const tree = NodeParser.parse(content)
    await tree.walk(function (node, next) {
      if (node.isEmpty()) {
        node.tagName = 'span'
      }
      next()
    })
    const html = tree.toHTML()
    expect(html).to.equal('<div>aaa<span></span>ccc</div>')
  })
  it('新增节点属性', async function () {
    let content = `<div>aaa<b></b>ccc</div>`;
    const tree = NodeParser.parse(content)
    await tree.walk(function (node, next) {
      if (node.isEmpty()) {
        node.attrs.class = 'new'
        node.attrs['data-id'] = 'data-id'
      }
      next()
    })
    const html = tree.toHTML()
    expect(html).to.equal('<div>aaa<b class="new" data-id="data-id"></b>ccc</div>')
  })
})

