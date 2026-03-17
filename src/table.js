// Table module - renders and manages the editable items table

export function renderTable(items, tbodyEl, totalEl) {
  tbodyEl.innerHTML = '';

  items.forEach((item, index) => {
    const row = createRow(item, index, tbodyEl, totalEl);
    tbodyEl.appendChild(row);
  });

  updateTotal(tbodyEl, totalEl);
}

export function createRow(item = { name: '', qty: 1, price: 0 }, index = -1, tbodyEl, totalEl) {
  const row = document.createElement('tr');
  const rowNum = index >= 0 ? index + 1 : tbodyEl.children.length + 1;

  row.innerHTML = `
    <td class="row-num">${rowNum}</td>
    <td><input type="text" value="${escapeHtml(item.name)}" placeholder="Nama item" data-field="name" /></td>
    <td><input type="number" value="${item.qty}" min="1" data-field="qty" style="width:50px" /></td>
    <td><input type="number" value="${item.price}" min="0" data-field="price" style="width:100px" /></td>
    <td class="subtotal">${formatRupiah(item.qty * item.price)}</td>
    <td>
      <button class="btn-delete-row" title="Hapus">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </td>
  `;

  // Event listeners
  row.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      const qty = parseInt(row.querySelector('[data-field="qty"]').value) || 0;
      const price = parseFloat(row.querySelector('[data-field="price"]').value) || 0;
      row.querySelector('.subtotal').textContent = formatRupiah(qty * price);
      updateTotal(tbodyEl, totalEl);
    });
  });

  row.querySelector('.btn-delete-row').addEventListener('click', () => {
    row.remove();
    reindexRows(tbodyEl);
    updateTotal(tbodyEl, totalEl);
  });

  return row;
}

export function addRow(tbodyEl, totalEl) {
  const row = createRow({ name: '', qty: 1, price: 0 }, -1, tbodyEl, totalEl);
  tbodyEl.appendChild(row);
  reindexRows(tbodyEl);
  row.querySelector('[data-field="name"]').focus();
}

function reindexRows(tbodyEl) {
  tbodyEl.querySelectorAll('tr').forEach((row, i) => {
    row.querySelector('.row-num').textContent = i + 1;
  });
}

function updateTotal(tbodyEl, totalEl) {
  let total = 0;
  tbodyEl.querySelectorAll('tr').forEach((row) => {
    const qty = parseInt(row.querySelector('[data-field="qty"]').value) || 0;
    const price = parseFloat(row.querySelector('[data-field="price"]').value) || 0;
    total += qty * price;
  });
  totalEl.textContent = formatRupiah(total);
}

export function getTableData(tbodyEl) {
  const items = [];
  tbodyEl.querySelectorAll('tr').forEach((row) => {
    items.push({
      name: row.querySelector('[data-field="name"]').value,
      qty: parseInt(row.querySelector('[data-field="qty"]').value) || 1,
      price: parseFloat(row.querySelector('[data-field="price"]').value) || 0,
    });
  });
  return items;
}

export function formatRupiah(amount) {
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
