import logging

logger = logging.getLogger(__name__)

def remove_duplicates_by_keys(obj_list: list, keys: list[str]) -> list:
    """
    Remove duplicates from a list of dicts or objects based on specified keys.

    :param obj_list: List of dictionaries or Pydantic objects to deduplicate
    :param keys: Keys or attributes to determine uniqueness
    :return: List of unique items
    """
    try:
        seen = set()
        unique_list = []

        for obj in obj_list:
            # Support both dicts and objects (e.g., Pydantic models)
            identifier = tuple(
                getattr(obj, k, None) if not isinstance(obj, dict) else obj.get(k)
                for k in keys
            )
            if identifier not in seen:
                seen.add(identifier)
                unique_list.append(obj)

        return unique_list
    except Exception as e:
        logger.error(f"Fail to remove duplicate: {e}")
        return obj_list