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

  console.log("master start")

  events((socket, type, value, reply) => {
    console.log(type, value)
    switch (type) {
      case "TEST": reply && reply({ result: true })
    }
  })

  setInterval(() => {
    console.log(master.clusters.size);
    console.log(master.nextCluster()?.[0]);
  }, 2000)

}).listen(18400, "0.0.0.0");
