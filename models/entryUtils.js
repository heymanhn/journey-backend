/*jslint node: true */
'use strict';

module.exports = {
  validateFields: function(next) {
    switch (this.type) {

      case 'text':
        if (!this.message) {
          return next(new Error('Text entry is missing a message'));
        }
        if (this.contents) {
          return next(new Error('Text entry has invalid contents'));
        }
        break;

      case 'photo':
      case 'audio':
      case 'video':
        if (!this.contents) {
          return next(new Error('Entry is missing contents'));
        }
        if ((typeof this.contents) !== 'string') {
          return next(new Error('Entry contents are invalid'));
        }
        break;

      default:
        return next(new Error('Invalid entry type'));
    }

    next();
  }
};
