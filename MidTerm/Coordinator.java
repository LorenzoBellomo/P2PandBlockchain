
import java.util.Map; 
import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.math.BigInteger;
import java.util.HashMap;
import java.util.Random;

/**
 * Class that models the coordinator. 
 * This entity is provided with a global view of the present nodes in the network
 * (they are stored in a Map) and is the entity that forces the join of the n nodes
 * 
 * @author Lorenzo Bellomo
 *
 */
public class Coordinator {
	
	/* Public and Static Fields */
	public static final int alpha = 3;

	/* Private Fields */
	private Map<BigInteger, NodeDescriptor> nodes;
	private Random rand;
	private long n, m, k;
	
	/* Statistics fields */
	private int numberOfCollisions;
	private long millisElapsed;

	/* Constructors */
	
	/**
	 * Constructor of the coordinator. It gets in input the parameters of the P2P network
	 * @param n number of nodes join
	 * @param m number of bits in the identifier
	 * @param k number of entries per bucket in the routing table
	 */
	public Coordinator(long n, long m, long k) {
		rand = new Random();
		this.n = n;
		this.m = m;
		this.k = k;
		numberOfCollisions = 0;
	}
	
	/* Methods */

	/**
	 * This method corresponds to the first phase (phase 1, initialization) in the
	 * midTerm text. It generates a first node with an empty routing table
	 */
	public void initialize() {
		nodes = new HashMap<>((int) n);
		Node node = Utils.generateNewNode(m);
		NodeDescriptor first = new NodeDescriptor(node, m, k, this);
		nodes.put(first.getNodeId(), first);
	}
	
	/**
	 * This method generates a new node with identifier in the legal range 
	 * of allowed identifiers. It then chooses at random a bootstrap node between
	 * the ones already present in the network and simulates the join for
	 * given node with given bootstrap. After that, it tells the new node to issue a 
	 * given number of findNode operations targeting random IDs in order to populate 
	 * some entries in the routing table (and advertise the new node).
	 */
	public void generateNewNode() {
		// I generate a random id (different from the previous ones

		Node node = Utils.generateNewNode(m);
		while (nodes.containsKey(node.getId())) {
			numberOfCollisions++;
			node = Utils.generateNewNode(m);
		}
		
		// I find a random bootstrap node starting from the present ones
		long bootstrapId = (long) (rand.nextDouble() * nodes.size());
		NodeDescriptor bootstrap = nodes.values().stream().skip(bootstrapId).findFirst().get();
		
		// I now join newId with bootstrap given
		NodeDescriptor newNode = new NodeDescriptor(node, m, k, this);
		nodes.put(node.getId(), newNode);
		newNode.joinNetwork(bootstrap);
		for(int i = 0; i < m; i++) {
			BigInteger randomId = Utils.generateIDInRightBucket(i, newNode.getNodeId());
			newNode.startFindNode(randomId, bootstrap);
		}	
	}
	
	/**
	 * This method simply makes the coordinator create the whole network, dump the
	 * network content to a csv file and display some stats about the network
	 */
	public void createNetwork() {
		
		long startTime = System.currentTimeMillis();
		
		initialize();
		for (int i = 0; i < n - 1; i++)
			generateNewNode();
		
		try (BufferedWriter writer = new BufferedWriter(new FileWriter("networkDump.csv"))) {
			for(NodeDescriptor n : nodes.values()) {
				try {
					n.dumpToFile(writer);
				} catch (IOException e) {
					e.printStackTrace();
				}
			}
		} catch (IOException e) {
			e.printStackTrace();
		}
		
		millisElapsed = System.currentTimeMillis() - startTime;
		dumpStatistics();

	}
	
	/**
	 * Returns the NodeDescriptor associated the requested id, necessary to make the RPC calls
	 * @param targetId the id to be returned
	 * @return the RPC instance
	 */
	public NodeDescriptor askRPCInstance(BigInteger targetId) {
		return nodes.get(targetId);
	}
	
	/**
	 * This method simply displays the various statistics about the network as 
	 * collected during its lifetime
	 */
	public void dumpStatistics() {
		System.out.println("number of collisions with the hash function = " + numberOfCollisions);
		long totEdges = 0;
		for(NodeDescriptor n : nodes.values())
			totEdges += n.exposeNumberOfEdges();
		System.out.println("number of total edges in the network = " + totEdges);
		System.out.println("if all the routing tables were filled, the number of edges would have been = " + (k*n*m) + " (k*n*m)");
		System.out.println("Time needed to build the network " + ((double) millisElapsed / 1000) + " seconds");
	}
}
