/*
  A nonogram game written in javascript
  https://github.com/DomenicoDeFelice/Pi-Nonograms

  Play the game: http://freenonograms.altervista.org

  Copyright (c) 2013-2015 Domenico De Felice

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

!function (global, $) {

if (!global.dfd) {
    global.dfd = {};
}

if (!dfd.nonograms) {
    dfd.nonograms = {};
}

dfd.nonograms.View = function (model, container) {
    this._model      = model;
    this._$container = $(container);
    this._$nonogram  = null;
    this._theme      = 'classic';

    var id;
    do {
        id = 'nonogram-' + dfd.Srand.randomIntegerIn(0, 1000000, Math.random());
    } while ($('#' + id).length);
    this._id = id;

    // Events fired by the View
    this.events = {};

    this.events.mouseDownOnCell = new dfd.Event(this);
    this.events.mouseUp         = new dfd.Event(this);
    this.events.mouseEntersCell = new dfd.Event(this);
    this.events.mouseLeavesCell = new dfd.Event(this);
}

dfd.nonograms.View.prototype = {
    show: function () {
        this.rebuildNonogram();
    },

    setSolved: function () {
        this._$nonogram.removeClass('nonogram_playing').addClass('nonogram_solved');
    },

    setUnsolved: function () {
        this._$nonogram.removeClass('nonogram_solved').addClass('nonogram_playing');
    },

    setTheme: function (theme) {
        if (this._$nonogram) {
            this._$nonogram.removeClass(this._theme).addClass(theme);
        }
        this._theme = theme;
    },

    highlightColumn: function (col) {
        this._$container.find('.nonogram_column_' + col + '_cell').addClass('nonogram_hovered_column');
        this._$container.find('#' + this._idOfColumnDefinition(col)).addClass('nonogram_hovered_column');
    },

    unhighlightColumn: function (col) {
        this._$container.find('.nonogram_column_' + col + '_cell').removeClass('nonogram_hovered_column');
        this._$container.find('#' + this._idOfColumnDefinition(col)).removeClass('nonogram_hovered_column');
    },

    setGuessAt: function (x, y, newGuess) {
        var cell = $('#' + this._idOfCell(x, y));
        var oldGuess = cell.data().guess;

        cell
            .removeClass('nonogram_correct_guess')
            .removeClass(this._guessToCSSClass(oldGuess))
            .addClass(this._guessToCSSClass(newGuess))
            .data({guess: newGuess});

        if (this._model.getCellAt(x, y) === newGuess) {
            cell.addClass('nonogram_correct_guess');
        }

        // Update row & column definitions
        $('#' + this._idOfRowDefinition(y)).html(this._rowDefinitionToHTML(this._model.getRowDefinition(y)));
        $('#' + this._idOfColumnDefinition(x)).html(this._columnDefinitionToHTML(this._model.getColumnDefinition(x)));
    },

    rebuildNonogram: function () {
        var width  = this._model.width,
        height = this._model.height;
        var x, y, tr;

        var table = this._$nonogram = $('<table>').attr('id', this._id).addClass('nonogram').addClass(this._theme);

        if (this._model.isSolved()) {
            table.addClass('nonogram_solved');
        } else {
            table.addClass('nonogram_playing');
        }

        // Column Definitions Row
        tr = $('<tr>').addClass('nonogram_row');

        // Top Left cell
        $('<td>').addClass('nonogram_top_left_cell').appendTo(tr);

        for (x = 0; x < width; x++) {
            if (x && x % 5 === 0) {
                $('<td>').addClass('nonogram_separation_column').appendTo(tr);
            }

            $('<td>')
                .attr('id', this._idOfColumnDefinition(x))
                .addClass('nonogram_definition nonogram_column_definition')
                .html(this._columnDefinitionToHTML(this._model.getColumnDefinition(x)))
                .appendTo(tr);
        }
        tr.appendTo(table);

        for (y = 0; y < height; y++) {
            // Separate groups of five rows
            if (y && y % 5 === 0) {
                $('<tr>')
                    .addClass('nonogram_separation_row')
                    .append($('<td colspan="' + (width + width - 1) + '">'))
                    .appendTo(table);
            }

            // Create new row
            tr = $('<tr>').addClass('nonogram_row');

            // Create definition for the current row
            $('<td>')
                .attr('id', this._idOfRowDefinition(y))
                .addClass('nonogram_definition nonogram_row_definition')
                .html(this._rowDefinitionToHTML(this._model.getRowDefinition(y)))
                .appendTo(tr);

            for (x = 0; x < width; x++) {
                // Separate groups of five columns
                if (x && x % 5 === 0) {
                    $('<td>')
                        .addClass('nonogram_separation_column')
                        .appendTo(tr);
                }

                // Build the actual nonogram cell
                $('<td>')
                    .attr('id', this._idOfCell(x, y))
                    .addClass(this._CSSClassesForCell(x, y))
                    .data({
                        x: x,
                        y: y,
                        guess: this._model.getGuessAt(x, y)
                    })
                    .appendTo(tr);
            }
            tr.appendTo(table);
        }

        this._setupEventHandlers(table);

        this._$container
            .finish()
            .hide()
            .empty()
            .append(table)
            .show();

    },

    // Private methods
    _setupEventHandlers: function ($target) {
        var view = this;

        $target.on('mousedown', 'td', function (e) {
            // Only take in consideration left button clicks
            if (e.which !== 1) return;

            e.preventDefault();

            var cellData = $(e.target).data();
            view.events.mouseDownOnCell.notify(cellData);
        });

        var mouseup_handler = function () {
            // Has the nonogram been removed from the DOM?
            if (!$.contains(document, $target[0])) {
                // If it has been removed, unbind this event handler
                // from document to avoid memory leaks (the references
                // to `view` and `$target` make it impossible for the
                // garbage collector to free them).
                 $(document).unbind('mouseup', mouseup_handler);
            } else {
                view.events.mouseUp.notify();
            }
        }
        $(document).on('mouseup', mouseup_handler);

        $target.on('mouseover', 'td', function (e) {
            e.preventDefault();

            var cellData = $(e.target).data();
            view.events.mouseEntersCell.notify(cellData);
        });

        $target.on('mouseout', 'td', function (e) {
            e.preventDefault();

            var cellData = $(e.target).data();
            view.events.mouseLeavesCell.notify(cellData);
        });
    },

    _idOfCell: function (x, y) {
        return this._id + '_x_' + x + '_y_' + y;
    },

    _idOfRowDefinition: function (row) {
        return this._id + '_row_' + row + '_definition';
    },

    _idOfColumnDefinition: function (col) {
        return this._id + '_column_' + col + '_definition';
    },

    _rowDefinitionToHTML: function (sequences) {
        var html = '<nobr>';
        var nSeq = sequences.length;
        for (var index = 0; index < nSeq; index++) {
            if (index) html += '&nbsp;';
            html += '<span class="nonogram_sequence';
            if (sequences[index].solved) {
                html += ' nonogram_solved_sequence';
            }
            html += '">' + sequences[index].length + '</span>';
        }
        html += '</nobr>';
        return html;
    },
    
    _columnDefinitionToHTML: function (sequences) {
        var html = '';
        var nSeq = sequences.length;
        for (var index = 0; index < nSeq; index++) {
            if (index) html += '<br>';
            html += '<nobr><span class="nonogram_sequence';
            if (sequences[index].solved) {
                html += ' nonogram_solved_sequence';
            }
            html += '">' + sequences[index].length + '</span></nobr>';
        }
        return html;
    },

    _CSSClassesForCell: function (x, y) {
        var cellGuess  = this._model.getGuessAt(x, y);
        var actualCell = this._model.getCellAt(x, y);

        var classes = [];

        classes.push('nonogram_cell');
        classes.push('nonogram_column_' + x + '_cell');
        classes.push(this._guessToCSSClass(cellGuess));

        if (cellGuess === actualCell) {
            classes.push('nonogram_correct_guess');
        }

        return classes.join(' ');
    },

    _guessToCSSClass: function (guess) {
        return 'nonogram_' + guess + '_cell';
    }
};

}(window, jQuery);
