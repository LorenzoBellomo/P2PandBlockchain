
import java.io.BufferedWriter;
import java.io.IOException;
import java.math.BigInteger;
import java.util.ArrayList; 
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;

/**
 * This is the class that modules an Node as viewed from the point of view of
 * the coordinator. It is characterized by all the needed informations to
 * identify a node, and the routing table of given node. This class provides all
 * the methods needed to make nodes interact and populate routingTables
 * 
 * @author Lorenzo Bellomo
 *
 */
public class NodeDescriptor {

	/* Private Fields */

	private long k, m;
	private Node node;
	private RoutingTable routingTable;
	private Coordinator coordinator;

	/* Constructors */

	/**
	 * It generates a node descriptor starting from a node identifier
	 * 
	 * @param node the new node
	 * @param m  the number of bits of the identifiers
	 * @param k  the number of entries per bucket in the routing tables
	 */
	public NodeDescriptor(Node node, long m, long k, Coordinator c) {
		this.node = node;
		this.k = k;
		this.m = m;
		this.coordinator = c;
		routingTable = new RoutingTable(m, k, node.getId());
	}

	/* Methods */

	/**
	 * It updates the routing table of this node from a list of node
	 * 
	 * @param list the list of potential nodes candidates.
	 */
	public void updateRoutingTable(List<Node> list) {
		for (Node n : list)
			updateRoutingTable(n);
	}

	/**
	 * It updates the routing table of this node from a single node. This method
	 * respects the "least recently seen" algorithm for updating entries in the
	 * routing table (even if the ping method is just a mock one representing a
	 * "churn-free" network)
	 * 
	 * @param node the single node to potentially add to the routing table
	 */
	public void updateRoutingTable(Node node) {
		if (node.getId().compareTo(this.getNodeId()) == 0)
			return;
		routingTable.tryAddNode(node);
	}

	/**
	 * This method is issued by the coordinator and orders this node to send a
	 * findNode command with the target id given as parameter
	 * 
	 * @param id        the id of the node to be found
	 * @param bootstrap is the bootstrap node used as anchor
	 */
	public void startFindNode(BigInteger id, NodeDescriptor bootstrap) {
		
		//TODO remove int i as parameter

		Queue<Node> traveledNodes = new LinkedList<>();
		traveledNodes.add(this.node);
		List<Node> result = bootstrap.findNode(id, traveledNodes);
		
		//TODO lookup o find node?

		updateRoutingTable(result);
	}

	/**
	 * Method find node as specified in the kademlia protocol
	 * 
	 * @param id            The id to find
	 * @param traveledNodes The list of nodes traveled up until this point
	 * @return the list of best-k nodes according to the routing table
	 */
	public List<Node> findNode(BigInteger id, Queue<Node> traveledNodes) {

		List<Node> bestK = routingTable.findBestEntries(k, id);
		for (Node n : traveledNodes)
			updateRoutingTable(n);
		traveledNodes.add(this.node);

		return bestK;
	}

	/**
	 * getter method for the node
	 * 
	 * @return this node (<IP, UDP port, identifier>)
	 */
	public Node getNode() {
		return node;
	}

	/**
	 * getter for the node identifier
	 * 
	 * @return the node id
	 */
	public BigInteger getNodeId() {
		return node.getId();
	}

	/**
	 * This method issues a nodeLookup with a target id this id. This way it
	 * populates his routing table with some neighbor
	 * 
	 * @param bootstrap the bootstrap node
	 */
	public void joinNetwork(NodeDescriptor bootstrap) {
		// I first add bootstrap to the routing table
		updateRoutingTable(bootstrap.node);
		List<Node> result = nodeLookup(this.getNodeId());
		updateRoutingTable(result);

	}

	/**
	 * Node lookup recursive procedure
	 * @param id the id for which the best k entries must be found in the net
	 * @return the list of best nodes 
	 */
	public List<Node> nodeLookup(BigInteger id) {
		Queue<Node> traveled = new LinkedList<>();
		traveled.add(this.node);
		List<Node> kClosest = routingTable.findBestEntries(Coordinator.alpha, id);
		Node closestNode = Utils.findClosestNode(kClosest, id, m);
		List<Node> queried = new ArrayList<>();
		List<Node> notQueried;
		boolean stop = false;
		do {
			stop = true;
			notQueried = Utils.findBestNotQueried(kClosest, queried, id, Coordinator.alpha);
			if(notQueried.size() == 0)
				break;
			for(Node n : notQueried) {
				NodeDescriptor instance = coordinator.askRPCInstance(n.getId());
				List<Node> result = instance.findNode(id, traveled);
				queried.add(n);
				Utils.updateKClosest(kClosest, result, id, k);
				Node newClosest = Utils.findClosestNode(kClosest, id, m);
				if(! newClosest.equals(closestNode))
					stop = false;
			}		
		} while (!stop);
		
		notQueried = Utils.getAllNotQueried(kClosest, queried, id);
		for(Node n : notQueried) {
			NodeDescriptor instance = coordinator.askRPCInstance(n.getId());
			List<Node> result = instance.findNode(id, traveled);
			Utils.updateKClosest(kClosest, result, id, k);
		}
		
		return kClosest;
	}
	
	/**
	 * Method that writes to the writer provided in input the content of
	 * the routing table, by respecting the csv format
	 * @param writer the write in which to write
	 * @throws IOException
	 */
	public void dumpToFile(BufferedWriter writer) throws IOException {
		writer.write(routingTable.getCSVDump());
	}
	
	public long exposeNumberOfEdges() {
		return routingTable.getNumberOfEdges();
	}

}
