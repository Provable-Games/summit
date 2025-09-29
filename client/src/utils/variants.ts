export const fadeVariant = {
  initial: {
    opacity: 1
  },
  enter: {
    opacity: 1,
    transition: { duration: 0.5 }
  },
  exit: {
    opacity: 0,
    transition: { duration: 1 }
  }
};

export const slideVariant = {
  enter: (direction: any) => {
    return {
      x: direction ? 1000 : -1000,
      opacity: 0
    };
  },
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: any) => {
    return {
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    };
  }
};