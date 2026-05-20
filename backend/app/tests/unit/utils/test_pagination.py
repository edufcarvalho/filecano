import unittest
from unittest.mock import MagicMock

from app.schemas import PaginatedResponse, PaginateParams
from app.utils.pagination import _paginate


class TestPaginate(unittest.TestCase):
  def setUp(self):
    self.session = MagicMock()
    self.session.exec = MagicMock()
    self.model = MagicMock()
    self.model.id = MagicMock()

  def _query(self, items=None):
    query = MagicMock()
    query.offset = MagicMock(return_value=query)
    query.limit = MagicMock(return_value=query)
    query.order_by = MagicMock(return_value=query)
    self.session.exec.return_value.all.return_value = items or []
    return query

  def test_paginate_returns_paginated_response(self):
    """_paginate should return a PaginatedResponse."""
    query = self._query()

    params = PaginateParams(page=0, page_size=10, total=100)
    result = _paginate(self, query, params)

    self.assertIsInstance(
      result, PaginatedResponse, "_paginate should return a PaginatedResponse"
    )

  def test_paginate_calculates_pages(self):
    """_paginate should correctly calculate total pages."""
    query = self._query()

    params = PaginateParams(page=0, page_size=10, total=100)
    result = _paginate(self, query, params)
    self.assertEqual(result.pages, 10, "100 items / 10 per page = 10 pages")

  def test_paginate_returns_items(self):
    """_paginate should include query results in the response."""
    items = []
    query = self._query(items)

    params = PaginateParams(page=0, page_size=10, total=5)
    result = _paginate(self, query, params)
    self.assertEqual(
      result.items, items, "_paginate should return the query results as items"
    )

  def test_paginate_offset_calculation(self):
    """_paginate should calculate offset as page * page_size."""
    query = self._query()

    params = PaginateParams(page=3, page_size=20, total=100)
    _paginate(self, query, params)
    call_args = query.offset.call_args[0]
    self.assertEqual(call_args[0], 60, "offset should be page(3) * page_size(20) = 60")

  def test_paginate_rounds_up_pages(self):
    """_paginate should round up for fractional page counts."""
    query = self._query()

    params = PaginateParams(page=0, page_size=10, total=21)
    result = _paginate(self, query, params)
    self.assertEqual(result.pages, 3, "21 items / 10 per page = 3 pages (rounded up)")

  def test_paginate_zero_items(self):
    """_paginate should handle zero total items."""
    query = self._query()

    params = PaginateParams(page=0, page_size=10, total=0)
    result = _paginate(self, query, params)
    self.assertEqual(result.pages, 0, "0 items should give 0 pages")
    self.assertEqual(result.total, 0, "total should be 0")


if __name__ == "__main__":
  unittest.main()
