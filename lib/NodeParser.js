const Node = function (tag, attrs, children) {
  this.tagName = tag || 'text'
  this.attrs = attrs || {}
  this.children = children || []
  this.content = ''
  // 可以通过设置该值，在toHTML时忽略该节点
  this.removed = false
  // 是否为文档片段，文档片段的节点，在渲染时，只会渲染子节点，而不会包含当前节点的标签和属性
  this.fragment = false
}
Node.prototype.remove = function () {
  this.removed = true
  this.children = []
  this.content = ''
  this.attrs = {}
}
// 同步walk
Node.prototype.walk = function (walker) {
  if (this.removed) {
    // 废弃的节点
    return
  }
  // old callback
  walker(this, function () {})
  this.children.forEach(function (child) {
    child.walk(walker)
  })
}
Node.prototype.isEmpty = function () {
  if (this.tagName === 'text') {
    return this.content.length === 0
  } else if (isSelfCloseTag(this.tagName)) {
    return false
  } else {
    return this.children.length === 0
  }
}
Node.prototype.toHTML = function () {
  if (this.removed) {
    return ''
  }
  var tag = this.tagName || 'div'
  if (tag === 'text') {
    return this.content
  }
  if (isSelfCloseTag(tag)) {
    return `<${tag}${parseAttrs(this.attrs)}/>`
  }
  var childrenHTML = this.children.map(function (child) {
    return child.toHTML()
  })
  if (this.fragment) {
    return childrenHTML.join('')
  }
  if (tag === 'comments') {
    // ?? 当前注释节点被当做了文本节点，所以不会存在comments分支
    return `<!--${childrenHTML.join('')}-->`
  } else {
    return `<${tag}${parseAttrs(this.attrs)}>${childrenHTML.join('')}</${tag}>`
  }
}

const isSelfCloseTag = (function () {
  const SELF_CLOSE_TAG = {};
  'area,base,br,col,command,embed,hr,img,input,keygen,link,meta,param,source,track,wbr,path,polygon,rect,mpvoice,qqmusic'.split(',').forEach(function (key) {
    SELF_CLOSE_TAG[key] = 1
  })
  return function (tag) {
    tag = (tag || '').toLowerCase()
    return SELF_CLOSE_TAG[tag] === 1
  }
})();

const parseString = function (string) {
  if (!string) {
    return []
  }
  string = string.trim()
  var nodes = []
  //  0: 非tag
  //  1: tag内
  //  2: 注释
  var status = 0
  var len = string.length
  // 字符串游标
  var cursor = 0
  var content = ''
  while (cursor < len) {
    // 预读4位，看是否为注释节点
    if (string.substr(cursor, 4) === '<!--') {
      // 找到最近的注释结束位置
      var commentsLength = string.substr(cursor).indexOf('-->') + 3
      var commentsContent = string.substr(cursor, commentsLength)
      cursor += commentsLength
      nodes.push(commentsContent)
      continue
    }
    var charset = string.charAt(cursor)
    switch (charset) {
      case '<':
        if (status === 0 && content) {
          // may be text node
          nodes.push(content)
          content = ''
        }
        content += charset
        status = 1
        break
      case '>':
        content += charset
        if (status === 1) {
          nodes.push(content)
          content = ''
          status = 0
        }
        break
      default:
        content += charset
    }
    cursor++
  }
  return nodes
}


const parseTag = function (list, parent) {
  if (list.length === 0) {
    // 空节点
    return new Node()
  }
  while (list.length > 0) {
    var str = list.shift()
    if (parent.tagName && str === `</${parent.tagName}>`) {
      // 遇到父标签结尾
      break
    }
    if (/^<!--/.test(str)) {
      // 发现注释节点，注释节点被当做text节点处理
      var textNode = new Node()
      textNode.content = str
      parent.children.push(textNode)
      continue
    }
    var begin = str.match(/^<([\w-:]*)/)
    if (begin) {
      // 标签开头, 后续所有内容纳入children
      var node = new Node(begin[1])

      str.replace(/([\w-]*)=['"]([^'"]*)['"]/g, function (match, key, value) {
        node.attrs[key] = value
      })

      parent.children.push(node)

      if (!isSelfCloseTag(node.tagName)) {
        parseTag(list, node)
      }
    } else {
      var textNode = new Node()
      textNode.content = str
      parent.children.push(textNode)
    }
  }
  return parent
}

var parseAttrs = function (attrs) {
  if (attrs) {
    var str = Object.keys(attrs).map(function (key) {
      return `${key}="${attrs[key]}"`
    }).join(' ')
    if (str) {
      return ' ' + str
    }
  }
  return ''
}

var parse = function (content) {
  const list = parseString(content)
  // 创造一个虚拟根节点
  const rootNode = new Node('div')
  rootNode.fragment = true
  const nodeTree = parseTag(list, rootNode)
  return nodeTree
}


module.exports = {
  Node: Node,
  parse: parse
}

