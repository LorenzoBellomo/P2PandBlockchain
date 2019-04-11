
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;
import java.util.Vector;
import java.util.stream.Collectors;

/**
 * This is the class that modules an Node as viewed from the point of view of the coordinator. 
 * It is characterized by all the needed informations to identify a node, and the routing table
 * of given node.
 * This class provides all the methods needed to make nodes interact and populate routingTables
 * 
 * @author Lorenzo Bellomo
 *
 */
public class NodeDescriptor {

	/* Private Fields */ 
	
	private long k;
	private Node node;
	private Vector<Queue<Node>> routingTable;
	
	/* Constructors */

	/**
	 * It generates a node descriptor starting from a node identifier
	 * @param id The node identifier of the new node
	 * @param m the number of bits of the identifiers
	 * @param k the number of entries per bucket in the routing tables
	 */
	public NodeDescriptor(long id, long m, long k) {
		node = new Node(id);
		this.k = k;
		routingTable = new Vector<>();
		routingTable.setSize((int) m);
	}
	
	/* Methods */

	/**
	 * It updates the routing table of this node from a list of node 
	 * @param list the list of potential nodes candidates.
	 */
	public void updateRoutingTable(List<Node> list) {
		for (Node n : list)
			updateRoutingTable(n);
	}

	/**
	 * It updates the routing table of this node from a single node.
	 * This method respects the "least recently seen" algorithm for 
	 * updating entries in the routing table (even if the ping method
	 * is just a mock one representing a "churn-free" network)
	 * @param node the single node to potentially add to the routing table
	 */
	public void updateRoutingTable(Node node) {
		if(node.getId() == this.getNodeId()) return;
		System.out.println("Trying to add " + node.getId() + " to " + this.getNodeId() + " routing table");
		Queue<Node> bucket = findBucket(node.getId());
		if(bucket == null) {
			int index = (int) findBucketIndex(node.getId());
			routingTable.add(index, new LinkedList<>());
			bucket = routingTable.get(index);
		}
		if (bucket.contains(node)) {
			// I move it to the end of the queue
			bucket.remove(node);
			bucket.add(node);
		} else {
			if (bucket.size() < k)
				bucket.add(node);
			else {
				// I have to first ping the least recently seen node
				Node leastRecent = bucket.poll();
				if (leastRecent.ping())
					bucket.add(leastRecent);
				else
					bucket.add(node);
			}
		}
	}

	/**
	 * This method is issued by the coordinator and orders this node to send
	 * a findNode command with the target id given as parameter
	 * @param id the id of the node to be found
	 * @param bootstrap is the bootstrap node used as anchor 
	 */
	public void startFindNode(long id, NodeDescriptor bootstrap) {
		Queue<Node> traveledNodes = new LinkedList<>();
		traveledNodes.add(this.node);
		System.out.println("Issuing find node, target = " + id + " from " + this.getNodeId());
		List<Node> result = bootstrap.findNode(id, traveledNodes);
		updateRoutingTable(result);
	}

	/**
	 * Method find node as specified in the kademlia protocol
	 * @param id The id to find
	 * @param traveledNodes The list of nodes traveled up until this point
	 * @return the list of best-k nodes according to the routing table
	 */
	public List<Node> findNode(long id, Queue<Node> traveledNodes) {
		
		List<Node> bestK = findBestEntries(k, id);
		for (Node n : traveledNodes)
			updateRoutingTable(n);
		traveledNodes.add(this.node);

		return bestK;
	}

	/**
	 * This method finds the best k entries in the routing table, where k
	 * is passed as a parameter. If the node knows less than k nodes, it
	 * just returns the whole set of known nodes
	 * @param k the number of entries to return
	 * @param id the target id from which to minimize the distance
	 * @return the list of best entries in the routing table
	 */
	public List<Node> findBestEntries(long k, long id) {

		List<Node> bestK;
		Queue<Node> bucket = findBucket(id); 
		if(bucket != null && bucket.size() >= k) {
			bestK = bucket.stream()
				.sorted((n1, n2) -> (int) ((n1.getId() ^ id) - (n2.getId() ^ id)))
				.limit(k)
				.collect(Collectors.toList());
		} else {
			// What I do with this stream is select all the values in the routing table
			// (queue of nodes), map this stream to a stream of nodes, sort according to the
			// closest with respect to the xor metric, and then pick the first k	
			bestK = routingTable.stream()
					.filter(q -> q != null)
					.flatMap(q -> q.stream())
					.sorted((n1, n2) -> (int) ((n1.getId() ^ id) - (n2.getId() ^ id)))
					.limit(k)
					.collect(Collectors.toList());
		}

		return bestK;
	}

	/**
	 * Given an id, it returns the bucket in the routing table of given id
	 * @param id the id whose bucket must be found
	 * @return the id of the bucket (in the range [0, m))
	 */
	public long findBucketIndex(long id) {
		long xorDistance = (long) (id ^ node.getId());
		return ((long) (Math.log(xorDistance) / Math.log(2)));

	}
	
	/**
	 * Similar to findBucketIndex, but actually returns the bucket
	 * @param id the id whose bucket must be found
	 * @return the bucket of this id, null if not initialized
	 */
	public Queue<Node> findBucket(long id) {
		long bucketId = findBucketIndex(id);
		return routingTable.get((int) bucketId);

	}

	/** 
	 * getter method for the node
	 * @return this node (<IP, UDP port, identifier>)
	 */
	public Node getNode() {
		return node;
	}

	/**
	 * getter for the node identifier
	 * @return the node id
	 */
	public long getNodeId() {
		return node.getId();
	}

	/**
	 * This method issues a find node with a target id this id. This way
	 * it populates his routing table with some neighbor
	 * @param bootstrap the bootstrap node
	 */
	public void joinNetwork(NodeDescriptor bootstrap) {
		Queue<Node> traveledNodes = new LinkedList<>();
		traveledNodes.add(this.node);
		List<Node> result = bootstrap.findNode(node.getId(), traveledNodes);
		updateRoutingTable(result);

	}
}
