/* A browser-local Word document. The XML parts use ZIP's stored method. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IdeaWord = factory();
})(typeof window === 'undefined' ? this : window, function () {
  'use strict';
  const encoder = new TextEncoder();
  const word = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const relationships = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const office = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const crcTable = Uint32Array.from({length: 256}, (_, value) => {
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
    return value >>> 0;
  });
  function crc32(bytes) {
    let checksum = 0xffffffff;
    for (const byte of bytes) checksum = crcTable[(checksum ^ byte) & 255] ^ (checksum >>> 8);
    return (checksum ^ 0xffffffff) >>> 0;
  }
  function zip(files) {
    const local = [], directory = [];
    let offset = 0, directorySize = 0;
    for (const [path, xml] of files) {
      const name = encoder.encode(path), data = encoder.encode(declaration + xml), crc = crc32(data);
      const header = new Uint8Array(30), h = new DataView(header.buffer);
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(12, 33, true);
      h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
      h.setUint16(26, name.length, true);
      local.push(header, name, data);
      const entry = new Uint8Array(46), e = new DataView(entry.buffer);
      e.setUint32(0, 0x02014b50, true); e.setUint16(4, 20, true); e.setUint16(6, 20, true);
      e.setUint16(14, 33, true); e.setUint32(16, crc, true); e.setUint32(20, data.length, true);
      e.setUint32(24, data.length, true); e.setUint16(28, name.length, true); e.setUint32(42, offset, true);
      directory.push(entry, name);
      offset += header.length + name.length + data.length;
      directorySize += entry.length + name.length;
    }
    const end = new Uint8Array(22), e = new DataView(end.buffer);
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, directorySize, true); e.setUint32(16, offset, true);
    return new Blob([...local, ...directory, end], {type: mime});
  }
  function xmlText(value) {
    return String(value).replace(/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/gu, '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function documentBlob(blocks) {
    const parts = blocks.flatMap(block => String(block.text).split(/\r\n|\r|\n/).map(line => {
      const style = ['Title', 'Heading1', 'Heading2'].includes(block.style)
        ? '<w:pPr><w:pStyle w:val="' + block.style + '"/></w:pPr>' : '';
      return '<w:p>' + style + '<w:r><w:t xml:space="preserve">' + xmlText(line) + '</w:t></w:r></w:p>';
    })).join('');
    const styles = [['Normal', 'Normal', 22], ['Title', 'Title', 36], ['Heading1','heading 1',30], ['Heading2','heading 2',25]]
      .map(([id, label, size]) => '<w:style w:type="paragraph" w:styleId="' + id + '"' +
        (id === 'Normal' ? ' w:default="1"' : '') + '><w:name w:val="' + label + '"/>' +
        (id === 'Normal' ? '' : '<w:basedOn w:val="Normal"/><w:next w:val="Normal"/>') +
        '<w:pPr>' + (id === 'Normal' ? '' : '<w:keepNext/>') + '<w:spacing w:after="120"/>' +
        (id.startsWith('Heading') ? '<w:outlineLvl w:val="' + (id.endsWith('1') ? 0 : 1) + '"/>' : '') +
        '</w:pPr><w:rPr>' + (id === 'Normal' ? '' : '<w:b/>') + '<w:sz w:val="' + size + '"/></w:rPr></w:style>').join('');
    return zip([
      ['[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'],
      ['_rels/.rels','<Relationships xmlns="' + relationships + '"><Relationship Id="rId1" Type="' + office + '/officeDocument" Target="word/document.xml"/></Relationships>'],
      ['word/document.xml','<w:document xmlns:w="' + word + '"><w:body>' + parts + '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr></w:body></w:document>'],
      ['word/_rels/document.xml.rels','<Relationships xmlns="' + relationships + '"><Relationship Id="rId1" Type="' + office + '/styles" Target="styles.xml"/></Relationships>'],
      ['word/styles.xml','<w:styles xmlns:w="' + word + '">' + styles + '</w:styles>']
    ]);
  }
  return {documentBlob: documentBlob};
});
