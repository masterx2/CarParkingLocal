$(function () {
	var cp = new CarPark({
		'container': '#primary-table'
	});
});

function CarPark (opts) {
	var _ = this;
	
	_.init = function () {
		_.log('Core Init...');
		_.DEBUG = true;
		_.container = $(opts.container);
		_.load('getall');
	};

	_.load = function (method, params) {
		_.log('Loading Data...');
	};

	_.process = function (data) {
		var table = $('<table>').addClass('table table-hover'),
			// Prepare header
			table_header = $('<thead>'),
			table_header_data = ['#', 'Parkplace', 'Owner', 'Money Left', 'Days Left', 'Description'];
			for (var th_index in table_header_data) {
				table_header.append($('<th>').text(table_header_data[th_index]));
			}
			table.append(table_header);
			// Render Data
			var table_body = $('<tbody>');
			for (var row in data) {
				var table_row = $('<tr>');
				for (var item in data[row]) {
					var table_cell = $('<td>').text(data[row][item]);
					table_row.append(table_cell);
				}
				table_body.append(table_row);
			}
			table.append(table_body);

			// Table Render
			_.container.empty().append(table);
	}
	
	_.log = function (data) {
		if(_.DEBUG){console.log(data);}
	};

	_.init()
}