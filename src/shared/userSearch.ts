export const userSearch = (search: string | null) => {
  if (!search) {
    return undefined;
  }

  const searchConditions = [];
  if (search) {
    searchConditions.push(
      { username: { contains: search, mode: "insensitive" } },
      { designation: { contains: search, mode: "insensitive" } }
    );
  }

  return {
    OR: searchConditions,
  };
};
