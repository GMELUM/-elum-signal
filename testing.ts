import { Cluster, Master } from "./src";
import { SignalCluster } from "./src/Cluster/Cluster";
import { SignalMaster } from "./src/Master/Master";

interface ISignalCluster extends SignalCluster {
  "TEST": [{ message: string }, { result: boolean }]
}

interface ISignalMaster extends SignalMaster {
  "CPU": [{}, { cpu: number }]
}

new Master<ISignalMaster, ISignalCluster>((master, events) => {

  events((socket, type, value, reply) => {
    const id = socket.id;
    console.log(id)
    switch (type) {
      case "TEST": reply && reply({ result: true })
    }
  })

}).listen(18400, "0.0.0.0");

new Cluster<ISignalMaster, ISignalCluster>(async (cluster, events) => {

  events((type, value, reply) => {
    console.log(type, value)
  });

  const promise = await cluster.send("TEST", { message: "Hello World" });

  console.log(promise);

  cluster.send("TEST", { message: "Hello World" }, (data) => {
    console.log("callback: ", data)
  })

}).connect({
  port: 18400,
  host: "127.0.0.1",
  subdomain: "c1"
});
