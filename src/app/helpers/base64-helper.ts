const decodeURIUntilStable = (str: string, max = 3) => {
  const initial = str;
  let decoded = decodeURIComponent(str);
  let counter = 0;
  while (decoded !== initial && counter < max) {
    decoded = decodeURIComponent(decoded);
    counter++;
  }
  return decoded;
};

export const encodeBase64 = (str: string): string | undefined => {
  try {
    return btoa(encodeURIComponent(str.trim()));
  } catch (error) {
    return undefined;
  }
};

export const decodeBase64 = (str: string) => {
  try {
    return atob(decodeURIUntilStable(str.trim()));
  } catch (error) {
    return undefined;
  }
};

export const isBase64 = (str: string) => {
  if (str === '' || str.trim() === '') {
    return false;
  }
  try {
    return atob(decodeURIUntilStable(str.trim()));
  } catch (error) {
    return false;
  }
};
