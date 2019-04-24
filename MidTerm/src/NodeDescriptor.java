
import java.io.BufferedWriter;
import java.io.IOException;
import java.math.BigInteger;
import java.util.ArrayList; 
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
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
	
	private List<Long> recursiveDepths;
	private long orderOfGeneration;

	/* Constructors */

	/**
	 * It generates a node descriptor starting from a node identifier
	 * 
	 * @param node the new node
	 * @param m  the number of bits of the identifiers
	 * @param k  the number of entries per bucket in the routing tables
	 * @param orderOfGeneration the number of this id, ordered by generation time
	 */
	public NodeDescriptor(Node node, long m, long k, Coordinator c, long orderOfGeneration) {
		this.node = node;
		this.k = k;
		this.m = m;
		this.coordinator = c;
		routingTable = new RoutingTable(m, k, node.getId());
		recursiveDepths = new ArrayList<>();
		this.orderOfGeneration = orderOfGeneration;
	}

	/* Methods */

	/**
	 * It updates the routing table of this node from a list of node, by applying
	 * the algorithm that pings the least recently seen node in case of a full bucket
	 * 
	 * @param list the list of potential nodes candidates.
	 */
	private void updateRoutingTable(List<Node> list) {
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
	private void updateRoutingTable(Node node) {
		if (node.getId().compareTo(this.getNodeId()) == 0)
			return;
		routingTable.tryAddNode(node);
	}

	/**
	 * This method is issued by the coordinator and orders this node to send a
	 * findNode command with the target id given as parameter
	 * 
	 * @param id        the id of the node to be found
	 */
	public void startFindNode(BigInteger id) {

		Queue<Node> traveledNodes = new LinkedList<>();
		traveledNodes.add(this.node);

		List<Node> result = nodeLookup(id);
		
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
		
		// I initialize the traveled list
		Queue<Node> traveled = new LinkedList<>();
		long recursiveDepth = 0;
		
		// I prepare kClosest (the list of closest known nodes, at most k), 
		// closestNode (the current closest known node to the targetID, used for
		// termination), queried (the list of queriedNodes), and notQueried (for 
		// later use)
		
		// find node actually finds the best k elements in my routing table
		List<Node> kClosest = this.findNode(id, traveled);
		Node closestNode = Utils.findClosestNode(kClosest, id, m);
		List<Node> queried = new ArrayList<>();
		List<Node> notQueried;
		boolean stop = false;
		do {
			recursiveDepth++;
			// This loop is executed until either I queried every element in kClosest, or
			// I do not update closestNode in one iteration
			stop = true; 
			// I find the alpha best not queried nodes
			notQueried = Utils.findBestNotQueried(kClosest, queried, id, Coordinator.alpha);
			if(notQueried.size() != 0) {
				// If I enter this if, then I have at least one node to query
				// else if I don't, stop is true, then I stop
				
				for(Node n : notQueried) {
					// For each node, I issue a find node asking the NodeDescriptor instance
					// to the coordinator, and I update
					NodeDescriptor instance = coordinator.askRPCInstance(n.getId());
					List<Node> result = instance.findNode(id, traveled);
					
					queried.add(n);
					Utils.updateKClosest(kClosest, result, id, k);
					// At this point I have at most k elements in kClosest (the most promising k)
					// I now update closestNode
					Node newClosest = Utils.findClosestNode(kClosest, id, m);
					if(! newClosest.equals(closestNode)) {
						closestNode = newClosest;
						stop = false;
					}
				}
			}
		} while (!stop);
		
		// At this point I have to query all the not queried nodes
		notQueried = Utils.getAllNotQueried(kClosest, queried);
		for(Node n : notQueried) {
			// I query it and update the kClosest
			NodeDescriptor instance = coordinator.askRPCInstance(n.getId());
			List<Node> result = instance.findNode(id, traveled);
			Utils.updateKClosest(kClosest, result, id, k);
		}
		
		recursiveDepths.add(new Long(recursiveDepth));
		
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
	
	/**
	 * Returns the number of edges of a node
	 * @return number of edges of this node
	 */
	public long exposeNumberOfEdges() {
		return routingTable.getNumberOfEdges();
	}
	
	/**
	 * This method simply returns the recursive depths gained by the lookup procedure
	 * @return the List containing the reached recursive depths
	 */
	public List<Long> exposeRecursiveDepth() {
		return this.recursiveDepths;
	}
	
	/**
	 * This method simply exposes to the Coordinator, for statistics reasons, the bucket index where
	 * id is supposed to go
	 * @return the bucket index where id should fall
	 */
	public Long exposeBucketIndex(BigInteger id) {
		return routingTable.findBucketIndex(id);
	}
	
	/**
	 * This method is a getter for the generation order of the node
	 * @return the generation order
	 */
	public long getGenerationOrder() {
		return orderOfGeneration;
	}
	
	
	/**
	 * This method adds the inDegrees to the key for each edge it has
	 * @param map the map of inDegrees
	 */
	public void addInDegrees(Map<BigInteger, Long> map) {
		routingTable.addInDegrees(map);
	}
	
}
