import { Platform, StringExt, ObjectExt } from '../../../util'
import { Size } from '../../../types'
import { Attr } from '../../attr'
import { Node } from '../../core/node'
import { Store } from '../../core/store'
import { NodeView } from '../../core/node-view'
import { NodeRegistry, ViewRegistry } from '../../registry'
import { getName, rootAttr } from './util'

const contentAction = 'content' as any
const contentSelector = '.text-block-content'
const registryName = getName('text-block')

export class TextBlock extends Node {
  public readonly store: Store<TextBlock.Properties>

  get content() {
    return this.getContent()
  }

  set content(val: string) {
    this.setContent(val)
  }

  getContent() {
    return this.store.get('content', '')
  }

  setContent(content?: string, options: Node.SetOptions = {}) {
    this.store.set('content', content, options)
  }

  protected setup() {
    super.setup()
    this.store.on('mutated', metadata => {
      const key = metadata.key
      if (key === 'content') {
        this.updateContent(this.getContent())
      } else if (key === 'size') {
        this.updateSize(this.getSize())
      }
    })

    this.updateSize(this.getSize())
    this.updateContent(this.getContent())
  }

  protected updateSize(size: Size) {
    if (Platform.SUPPORT_FOREIGNOBJECT) {
      this.setAttrs({
        foreignObject: { ...size },
        [contentSelector]: {
          style: { ...size },
        },
      })
    }
  }

  protected updateContent(content?: string) {
    if (Platform.SUPPORT_FOREIGNOBJECT) {
      this.setAttrs({
        [contentSelector]: {
          html: content ? StringExt.sanitizeHTML(content) : '',
        },
      })
    } else {
      this.setAttrs({
        [contentSelector]: {
          text: content,
        },
      })
    }
  }
}

export namespace TextBlock {
  export interface Properties extends Node.Properties {
    content?: string
  }
}

export class TextBlockView extends NodeView<TextBlock> {
  confirmUpdate(flag: number, options: any = {}) {
    let ret = super.confirmUpdate(flag, options)
    if (this.hasAction(ret, contentAction)) {
      this.updateContent()
      ret = this.removeAction(ret, contentAction)
    }
    return ret
  }

  update(partialAttrs?: Attr.CellAttrs) {
    if (Platform.SUPPORT_FOREIGNOBJECT) {
      super.update(partialAttrs)
    } else {
      const node = this.cell
      const attrs = { ...(partialAttrs || node.getAttrs()) }
      delete attrs[contentSelector]
      super.update(attrs)
      if (!partialAttrs || ObjectExt.has(partialAttrs, contentSelector)) {
        this.updateContent(partialAttrs)
      }
    }
  }

  updateContent(partialAttrs?: Attr.CellAttrs) {
    if (Platform.SUPPORT_FOREIGNOBJECT) {
      super.update(partialAttrs)
    } else {
      const node = this.cell
      const textAttrs = (partialAttrs || node.getAttrs())[contentSelector]

      // Break the text to fit the node size taking into
      // account the attributes set on the node.
      const text = StringExt.breakText(
        node.getContent(),
        node.getSize(),
        textAttrs,
        {
          svgDocument: this.graph.svg,
        },
      )

      const attrs = {
        [contentSelector]: ObjectExt.merge({}, textAttrs, { text }),
      }

      super.update(attrs)
    }
  }
}

TextBlock.config({
  view: registryName,

  markup: [
    '<g class="rotatable">',
    '<g class="scalable"><rect/></g>',
    Platform.SUPPORT_FOREIGNOBJECT
      ? [
          `<foreignObject>`,
          `<body xmlns="http://www.w3.org/1999/xhtml">`,
          `<div class="${contentSelector.substr(1)}" />`,
          `</body>`,
          `</foreignObject>`,
        ].join('')
      : `<text class="${contentSelector.substr(1)}"/>`,
    '</g>',
  ].join(''),

  attrs: {
    ...rootAttr,
    rect: {
      fill: '#ffffff',
      stroke: '#000000',
      width: 80,
      height: 100,
    },
    text: {
      fill: '#000000',
      fontSize: 14,
      fontFamily: 'Arial, helvetica, sans-serif',
    },
    body: {
      style: {
        background: 'transparent',
        position: 'static',
        margin: 0,
        padding: 0,
      },
    },
    foreignObject: {
      style: {
        overflow: 'hidden',
      },
    },
    [contentSelector]: {
      refX: 0.5,
      refY: 0.5,
      yAlignment: 'middle',
      xAlignment: 'middle',
      style: {
        textAlign: 'center',
        verticalAlign: 'middle',
        display: 'table-cell',
        padding: '0 5px',
        margin: 0,
      },
    },
  },
})

TextBlockView.config({
  bootstrap: ['render', contentAction],
  actions: Platform.SUPPORT_FOREIGNOBJECT
    ? {}
    : {
        size: contentAction,
        content: contentAction,
      },
})

NodeRegistry.register(registryName, TextBlock)
ViewRegistry.register(registryName, TextBlockView)
