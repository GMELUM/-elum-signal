import { Cluster, Master } from "./src";
import { SignalCluster } from "./src/Cluster/Cluster";
import { SignalMaster } from "./src/Master/Master";

interface ISignalCluster extends SignalCluster {
  "TEST": [{ message: string }, { result: boolean }]
}

interface ISignalMaster extends SignalMaster {
  "CPU": [{}, { cpu: number }]
}

new Cluster<ISignalMaster, ISignalCluster>(async (cluster, events) => {

  console.log("cluster start")

  events((type, value, reply) => {
    console.log(type, value)
    switch (type) {
      case "CLOSE": console.log("CLOSE"); break;
      case "END": console.log("END"); break;
      case "ERROR": setTimeout(() => cluster.reconnect(), 5000); break;
    }
  });

  // cluster.send("TEST", { message: "Hello World" }, (data) => {
  //   console.log("callback: ", data)
  // })

  // setTimeout(() => { cluster.close(); console.log("close") }, 10000);

  // const promise = cluster.send("TEST", { message: "Hello World" });

  // console.log(promise);

  // cluster.send("TEST", { message: "Hello World" }, (data) => {
  //   console.log("callback: ", data)
  // })

}).connect({
  port: 18400,
  host: "127.0.0.1",
  subdomain: "c2"
});
