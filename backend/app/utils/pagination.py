from sqlmodel import SelectOfScalar

from app.schemas import PaginatedResponse as Response
from app.schemas import PaginateParams as Params


def _paginate(self, query: SelectOfScalar, params: Params) -> Response:
  offset = params.page * params.page_size

  query = query.offset(offset).limit(params.page_size).order_by(self.model.id)
  result = self.session.exec(query).all()

  return Response(
    items=result,
    total=params.total,
    page=params.page,
    size=params.page_size,
    pages=(params.total + params.page_size - 1) // params.page_size,
  )
