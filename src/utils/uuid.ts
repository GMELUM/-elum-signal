const uuid = (masc: string = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx") => {
  let d = new Date().getTime();
  let uuid = masc.replace(/[xy]/g, (c) => {
    let r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  return uuid;
}

export default uuid;
